import { useState, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Upload, Download, FileSpreadsheet, Check, AlertCircle, 
  Search, RefreshCw, Trash2, Eye, FileText, ArrowLeft,
  Info, CheckCircle, XCircle, ShieldAlert, Loader2
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cmsArticles, CMSArticle } from "@/data/cmsContent";
import { allSEOFaqs, SEOFaq } from "@/data/seoFaqs";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

interface ParsedRow {
  title: string;
  subtitle?: string;
  content?: string;
  tags?: string;
  category?: string;
  slug?: string;
  type: 'faq' | 'article';
  wordCount?: number;
  isValid: boolean;
  validationError?: string;
}

// Generate SEO-friendly slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/-$/, '');
};

const CMSAdmin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  const [uploadedData, setUploadedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("faqs");
  const [previewItem, setPreviewItem] = useState<ParsedRow | CMSArticle | SEOFaq | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.id) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        if (error) throw error;
        setIsAdmin(data && data.length > 0);
      } catch (err) {
        console.error('Error checking admin access:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAccess(false);
      }
    };
    
    if (isAuthenticated) {
      checkAdminAccess();
    } else if (!sessionLoading) {
      setCheckingAccess(false);
    }
  }, [user?.id, isAuthenticated, sessionLoading]);

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

  // Handle file upload with comprehensive parsing
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      const allRows: ParsedRow[] = [];
      
      // Process each sheet in the workbook
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
        
        const isFaqSheet = sheetName.toLowerCase().includes('faq') || 
                          file.name.toLowerCase().includes('faq');
        
        jsonData.forEach(row => {
          if (!row.Title && !row.Question) return;
          
          const title = (row.Title || row.Question || '').trim();
          const content = (row['Page Text'] || row.Content || row.Answer || '').trim();
          
          let validation = { isValid: true, wordCount: 0, error: '' };
          if (isFaqSheet && content) {
            validation = validateFAQ(content);
          } else if (content) {
            validation.wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
          }

          allRows.push({
            title,
            subtitle: (row.Subtitle || row.Category || '').trim(),
            content,
            tags: (row.Tags || '').trim(),
            category: (row.Category || row.Section || '').trim(),
            slug: row.Slug?.trim() || generateSlug(title),
            type: isFaqSheet ? 'faq' : 'article',
            wordCount: validation.wordCount,
            isValid: !isFaqSheet || !content || validation.isValid,
            validationError: validation.error || undefined
          });
        });
      });

      setUploadedData(allRows);
      
      const validCount = allRows.filter(r => r.isValid).length;
      const invalidCount = allRows.length - validCount;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${allRows.length} rows from ${workbook.SheetNames.length} sheet(s). ${invalidCount} have validation issues.`);
      } else {
        toast.success(`Successfully parsed ${allRows.length} rows from ${workbook.SheetNames.length} sheet(s)`);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  }, []);

  // Export current CMS data to Excel with proper formatting
  const handleExportCMS = useCallback(() => {
    try {
      // Prepare FAQ data with all fields
      const faqData = allSEOFaqs.map(faq => ({
        'Title': faq.question,
        'Answer': faq.answer,
        'Category': faq.category,
        'Tags': faq.tags.join(', '),
        'Priority': faq.priority,
        'Word Count': faq.answer.split(/\s+/).filter(w => w.length > 0).length
      }));

      // Prepare CMS articles data
      const articleData = cmsArticles.map(article => ({
        'Title': article.title,
        'Subtitle': article.subtitle,
        'Content': article.content,
        'Tags': article.tags.join(', '),
        'Category': article.category,
        'Slug': article.slug,
        'Featured': article.featured ? 'Yes' : 'No',
        'Created': article.createdAt
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // FAQs sheet
      const faqSheet = XLSX.utils.json_to_sheet(faqData);
      // Set column widths
      faqSheet['!cols'] = [
        { wch: 60 }, // Title
        { wch: 80 }, // Answer
        { wch: 20 }, // Category
        { wch: 40 }, // Tags
        { wch: 10 }, // Priority
        { wch: 12 }  // Word Count
      ];
      XLSX.utils.book_append_sheet(workbook, faqSheet, 'FAQs');
      
      // Articles sheet
      const articleSheet = XLSX.utils.json_to_sheet(articleData);
      articleSheet['!cols'] = [
        { wch: 60 }, // Title
        { wch: 40 }, // Subtitle
        { wch: 100 }, // Content
        { wch: 40 }, // Tags
        { wch: 20 }, // Category
        { wch: 50 }, // Slug
        { wch: 10 }, // Featured
        { wch: 12 }  // Created
      ];
      XLSX.utils.book_append_sheet(workbook, articleSheet, 'CMS Articles');

      // Template sheet for reference
      const templateData = [
        {
          'Field': 'Title',
          'Required': 'Yes',
          'Description': 'The main title or question',
          'Example': 'What is carbon MRV?'
        },
        {
          'Field': 'Answer/Content',
          'Required': 'Yes',
          'Description': 'Main content (FAQs: 29-45 words)',
          'Example': 'Carbon MRV refers to...'
        },
        {
          'Field': 'Category',
          'Required': 'No',
          'Description': 'Content category',
          'Example': 'technology, regulations, finance'
        },
        {
          'Field': 'Tags',
          'Required': 'No',
          'Description': 'Comma-separated keywords',
          'Example': 'carbon, MRV, verification'
        },
        {
          'Field': 'Slug',
          'Required': 'No',
          'Description': 'URL-friendly identifier (auto-generated if blank)',
          'Example': 'what-is-carbon-mrv'
        }
      ];
      const templateSheet = XLSX.utils.json_to_sheet(templateData);
      templateSheet['!cols'] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 40 },
        { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template Guide');

      // Download
      XLSX.writeFile(workbook, `senseible-cms-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('CMS data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CMS data');
    }
  }, []);

  // Download blank template
  const handleDownloadTemplate = useCallback(() => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // FAQ template
      const faqTemplate = [
        { Title: 'What is Senseible?', Answer: 'Senseible is an AI-powered carbon verification infrastructure for MSMEs across emerging markets, enabling carbon MRV to monetization in under 47 seconds.', Category: 'brand', Tags: 'senseible, carbon, MRV', Priority: 'high' },
        { Title: '', Answer: '', Category: '', Tags: '', Priority: '' }
      ];
      const faqSheet = XLSX.utils.json_to_sheet(faqTemplate);
      faqSheet['!cols'] = [{ wch: 60 }, { wch: 80 }, { wch: 20 }, { wch: 40 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, faqSheet, 'FAQs');
      
      // Article template
      const articleTemplate = [
        { Title: 'Understanding Carbon MRV', Subtitle: 'Technology Deep-Dive', Content: 'Carbon MRV (Measurement, Reporting, Verification) is the backbone of credible climate action...', Category: 'technology', Tags: 'MRV, carbon, verification', Slug: 'understanding-carbon-mrv', Featured: 'Yes' },
        { Title: '', Subtitle: '', Content: '', Category: '', Tags: '', Slug: '', Featured: '' }
      ];
      const articleSheet = XLSX.utils.json_to_sheet(articleTemplate);
      articleSheet['!cols'] = [{ wch: 60 }, { wch: 40 }, { wch: 100 }, { wch: 20 }, { wch: 40 }, { wch: 50 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, articleSheet, 'Articles');

      XLSX.writeFile(workbook, 'senseible-cms-template.xlsx');
      toast.success('Template downloaded');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  }, []);

  // Filter content based on search
  const filteredFaqs = allSEOFaqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = cmsArticles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats
  const stats = {
    totalFaqs: allSEOFaqs.length,
    totalArticles: cmsArticles.length,
    validUploads: uploadedData.filter(r => r.isValid).length,
    invalidUploads: uploadedData.filter(r => !r.isValid).length
  };

  // Loading state
  if (sessionLoading || checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied for non-admins
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
        <Helmet><title>Access Denied — Senseible</title></Helmet>
        <CarbonParticles />
        <Navigation />
        
        <main className="relative z-10 container mx-auto px-4 py-8 max-w-lg">
          <Card className="border-destructive/20">
            <CardContent className="pt-8 text-center">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-6">
                This page is restricted to administrators only.
              </p>
              <Button asChild>
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet><title>CMS Admin — Senseible</title></Helmet>
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">CMS Administration</h1>
          <p className="text-muted-foreground">
            Import, export, and manage FAQ and CMS content via spreadsheets. No code changes required.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{stats.totalFaqs}</div>
              <div className="text-sm text-muted-foreground">FAQs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{stats.totalArticles}</div>
              <div className="text-sm text-muted-foreground">Articles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-success">{stats.validUploads}</div>
              <div className="text-sm text-muted-foreground">Valid Uploads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-destructive">{stats.invalidUploads}</div>
              <div className="text-sm text-muted-foreground">Issues</div>
            </CardContent>
          </Card>
        </div>

        {/* Import/Export Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Import Content
              </CardTitle>
              <CardDescription>
                Upload Excel or CSV files to update FAQs and articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>FAQ answers must be 29-45 words for SEO optimization</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Current Data
              </CardTitle>
              <CardDescription>
                Download current CMS database for editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportCMS} className="w-full">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Includes {stats.totalFaqs} FAQs and {stats.totalArticles} articles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Blank Template
              </CardTitle>
              <CardDescription>
                Download template with example data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Pre-formatted with correct column headers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Preview */}
        {uploadedData.length > 0 && (
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Upload Preview
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {uploadedData.filter(r => r.isValid).length} valid
                  </Badge>
                  {uploadedData.some(r => !r.isValid) && (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      {uploadedData.filter(r => !r.isValid).length} issues
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead className="min-w-[250px]">Title</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead className="w-20 text-right">Words</TableHead>
                      <TableHead className="w-32">Slug</TableHead>
                      <TableHead className="min-w-[150px]">Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedData.slice(0, 30).map((row, i) => (
                      <TableRow key={i} className={!row.isValid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="line-clamp-2">{row.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.type === 'faq' ? 'default' : 'secondary'}>
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.wordCount || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {row.slug}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">
                          {row.validationError || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {uploadedData.length > 30 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Showing 30 of {uploadedData.length} rows
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <Button 
                  disabled={uploadedData.some(r => !r.isValid)}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Import {uploadedData.filter(r => r.isValid).length} Valid Rows
                </Button>
                <Button variant="outline" onClick={() => setUploadedData([])}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Database import requires admin authentication. Content will be available after approval.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content Browser */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="text-lg">Content Browser</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search content or tags..."
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
                <div className="max-h-[400px] overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[300px]">Question</TableHead>
                        <TableHead className="w-28">Category</TableHead>
                        <TableHead className="w-20">Priority</TableHead>
                        <TableHead className="w-20 text-right">Words</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFaqs.slice(0, 50).map((faq) => (
                        <TableRow key={faq.id}>
                          <TableCell className="max-w-md">
                            <p className="font-medium line-clamp-1">{faq.question}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {faq.answer}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={faq.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                              {faq.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {faq.answer.split(/\s+/).filter(w => w.length > 0).length}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewItem(faq)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>{faq.question}</DialogTitle>
                                  <DialogDescription>
                                    <Badge variant="outline" className="mr-2">{faq.category}</Badge>
                                    <Badge variant="secondary">{faq.priority}</Badge>
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <p className="text-muted-foreground">{faq.answer}</p>
                                  <div>
                                    <p className="text-sm font-medium mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                      {faq.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Word count: {faq.answer.split(/\s+/).filter(w => w.length > 0).length}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredFaqs.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Showing 50 of {filteredFaqs.length} FAQs
                  </p>
                )}
              </TabsContent>

              <TabsContent value="articles">
                <div className="max-h-[400px] overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[300px]">Title</TableHead>
                        <TableHead className="w-28">Category</TableHead>
                        <TableHead className="w-20">Featured</TableHead>
                        <TableHead className="w-32">Slug</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.slice(0, 50).map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="max-w-md">
                            <p className="font-medium line-clamp-1">{article.title}</p>
                            <p className="text-sm text-muted-foreground">{article.subtitle}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{article.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {article.featured && <CheckCircle className="w-4 h-4 text-success" />}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {article.slug}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>{article.title}</DialogTitle>
                                  <DialogDescription>{article.subtitle}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="prose prose-sm max-w-none text-muted-foreground">
                                    {article.content.split('\n\n').slice(0, 3).map((para, i) => (
                                      <p key={i}>{para}</p>
                                    ))}
                                    {article.content.split('\n\n').length > 3 && (
                                      <p className="text-primary">... and more</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                      {article.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Slug: <code className="bg-muted px-1 rounded">/climate-intelligence/{article.slug}</code>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredArticles.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Showing 50 of {filteredArticles.length} articles
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Note:</strong> CMS updates sync automatically across the platform. 
            FAQ answers are constrained to 29-45 words for SEO optimization. 
            All CMS content includes an AI disclaimer footer.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CMSAdmin;
