import { useState, useRef } from "react";
import { Upload, Camera } from "lucide-react";

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
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center
        w-32 h-32 sm:w-36 sm:h-36
        rounded-full cursor-pointer
        transition-all duration-500 ease-out
        ${isDragging 
          ? "scale-105 bg-primary/10 border-primary/30" 
          : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/20"
        }
        ${isProcessing ? "animate-gentle-pulse" : ""}
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
      
      <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-105">
        <div className="relative">
          <Upload 
            className={`
              w-7 h-7 transition-all duration-300
              ${isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
            `}
          />
          <Camera 
            className={`
              absolute -bottom-1 -right-1 w-4 h-4
              transition-all duration-300
              ${isDragging ? "text-primary" : "text-muted-foreground/60 group-hover:text-primary/60"}
            `}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          Document
        </span>
      </div>
      
      {/* Subtle ring animation on hover */}
      <div className="absolute inset-0 rounded-full border border-primary/0 group-hover:border-primary/10 transition-all duration-500" />
    </div>
  );
};
