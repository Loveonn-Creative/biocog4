import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { CarbonParticles } from "@/components/CarbonParticles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Upload, Download, FileSpreadsheet, Check, AlertCircle, 
  Search, RefreshCw, Trash2, Eye
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cmsArticles } from "@/data/cmsContent";
import { allSEOFaqs } from "@/data/seoFaqs";

interface ParsedRow {
  title: string;
  subtitle?: string;
  content?: string;
  tags?: string;
  category?: string;
  type: 'faq' | 'article';
  wordCount?: number;
  isValid: boolean;
  validationError?: string;
}

const CMSAdmin = () => {
  const [uploadedData, setUploadedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("faqs");

  // Validate FAQ word count (29-45 words)
  const validateFAQ = (content: string): { isValid: boolean; wordCount: number; error: string } => {
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 29) {
      return { isValid: false, wordCount, error: `Too short: ${wordCount} words (min 29)` };
    }
    if (wordCount > 45) {
      return { isValid: false, wordCount, error: `Too long: ${wordCount} words (max 45)` };
    }
    return { isValid: true, wordCount, error: '' };
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const parsedRows: ParsedRow[] = jsonData
        .filter(row => row.Title && row.Title.trim())
        .map(row => {
          const isFaq = file.name.toLowerCase().includes('faq');
          const content = row['Page Text'] || row['Content'] || '';
          
          let validation = { isValid: true, wordCount: 0, error: undefined as string | undefined };
          if (isFaq && content) {
            validation = validateFAQ(content);
          }

          return {
            title: row.Title?.trim() || '',
            subtitle: row.Subtitle?.trim() || '',
            content: content.trim(),
            tags: row.Tags?.trim() || '',
            category: row.Category?.trim() || '',
            type: isFaq ? 'faq' : 'article',
            wordCount: validation.wordCount,
            isValid: !isFaq || !content || validation.isValid,
            validationError: validation.error
          };
        });

      setUploadedData(parsedRows);
      
      const validCount = parsedRows.filter(r => r.isValid).length;
      const invalidCount = parsedRows.length - validCount;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${parsedRows.length} rows. ${invalidCount} have validation issues.`);
      } else {
        toast.success(`Successfully parsed ${parsedRows.length} rows`);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Export current CMS data to Excel
  const handleExportCMS = useCallback(() => {
    try {
      // Prepare FAQ data
      const faqData = allSEOFaqs.map(faq => ({
        'Title': faq.question,
        'Subtitle': faq.category,
        'Page Text': faq.answer,
        'Tags': faq.tags.join(', '),
        'Category': faq.category,
        'Priority': faq.priority
      }));

      // Prepare CMS articles data
      const articleData = cmsArticles.map(article => ({
        'Title': article.title,
        'Subtitle': article.subtitle,
        'Page Text': article.content,
        'Tags': article.tags.join(', '),
        'Category': article.category,
        'Slug': article.slug,
        'Featured': article.featured ? 'Yes' : 'No'
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      const faqSheet = XLSX.utils.json_to_sheet(faqData);
      XLSX.utils.book_append_sheet(workbook, faqSheet, 'FAQs');
      
      const articleSheet = XLSX.utils.json_to_sheet(articleData);
      XLSX.utils.book_append_sheet(workbook, articleSheet, 'CMS Articles');

      // Download
      XLSX.writeFile(workbook, `senseible-cms-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('CMS data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CMS data');
    }
  }, []);

  // Filter content based on search
  const filteredFaqs = allSEOFaqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArticles = cmsArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>CMS Admin — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">CMS Administration</h1>
          <p className="text-muted-foreground">
            Import, export, and manage FAQ and CMS content via spreadsheets
          </p>
        </div>

        {/* Import/Export Actions */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Content
              </CardTitle>
              <CardDescription>
                Upload Excel or CSV files to update FAQs and CMS articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                {isUploading && <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                FAQ answers must be 29-45 words. Supported: .xlsx, .xls, .csv
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Content
              </CardTitle>
              <CardDescription>
                Download current CMS database as Excel for editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCMS} className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Includes {allSEOFaqs.length} FAQs and {cmsArticles.length} articles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Preview */}
        {uploadedData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Upload Preview</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {uploadedData.filter(r => r.isValid).length} valid
                  </Badge>
                  {uploadedData.some(r => !r.isValid) && (
                    <Badge variant="destructive">
                      {uploadedData.filter(r => !r.isValid).length} issues
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {row.isValid ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate">
                          {row.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.type}</Badge>
                        </TableCell>
                        <TableCell>{row.wordCount || '-'}</TableCell>
                        <TableCell className="text-sm text-destructive">
                          {row.validationError || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {uploadedData.length > 20 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Showing 20 of {uploadedData.length} rows
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <Button disabled className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Import to Database
                </Button>
                <Button variant="outline" onClick={() => setUploadedData([])}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Database import requires admin authentication
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content Browser */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="text-lg">Content Browser</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="faqs">
                  FAQs ({filteredFaqs.length})
                </TabsTrigger>
                <TabsTrigger value="articles">
                  Articles ({filteredArticles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faqs">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFaqs.slice(0, 50).map((faq) => (
                        <TableRow key={faq.id}>
                          <TableCell className="max-w-md">
                            <p className="font-medium truncate">{faq.question}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {faq.answer.substring(0, 80)}...
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{faq.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={faq.priority === 'high' ? 'default' : 'secondary'}>
                              {faq.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" disabled>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="articles">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.slice(0, 50).map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="max-w-md">
                            <p className="font-medium truncate">{article.title}</p>
                            <p className="text-sm text-muted-foreground">{article.subtitle}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{article.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {article.featured && <Check className="w-4 h-4 text-success" />}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" disabled>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          CMS updates sync automatically across the platform. FAQ answers are constrained to 29-45 words for SEO optimization.
        </p>
      </main>
    </div>
  );
};

export default CMSAdmin;
