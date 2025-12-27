import { useState, useRef } from "react";
import { Upload } from "lucide-react";

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
    if (file && (file.type.includes("image") || file.type === "application/pdf")) {
      onFileSelect(file);
    }
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
            : "bg-background border-border/60 hover:border-primary/30 hover:bg-secondary/30"
          }
          ${isProcessing ? "animate-pulse" : ""}
          border-2 border-dashed
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
            ${isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
          `}
          strokeWidth={1.5}
        />
      </div>
      
      <span className="text-sm text-muted-foreground font-medium tracking-wide">
        Document
      </span>
    </div>
  );
};
