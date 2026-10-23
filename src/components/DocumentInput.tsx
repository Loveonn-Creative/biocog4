import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface DocumentInputProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const DocumentInput = ({ onFileSelect, isProcessing }: DocumentInputProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type.includes("image") || file.type === "application/pdf") onFileSelect(file);
    else toast.error("Upload a PDF or a photo (JPG, PNG, WEBP or HEIC) of the invoice or bill.");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Upload a document"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex items-center justify-center
          w-28 h-28 sm:w-32 sm:h-32
          rounded-2xl cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging 
            ? "scale-105 bg-primary/5 border-primary/40" 
            : "bg-primary/[0.06] border-primary/45 hover:border-primary/70 hover:bg-primary/10"
          }
          ${isProcessing ? "animate-pulse" : ""}
          border-2 border-dashed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          group
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <Upload 
          className={`
            w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300
            text-primary
          `}
          strokeWidth={1.5}
        />
      </div>
      
      <span className="text-sm text-foreground font-medium tracking-wide">
        Document
      </span>
    </div>
  );
};
