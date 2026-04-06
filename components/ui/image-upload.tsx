"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to process image');
    } finally {
      setIsCompressing(false);
      // Reset input value to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-4 w-full">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      
      <div className="flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-50">
        {value ? (
          <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
            <Image 
              src={value} 
              alt="Preview" 
              fill 
              className="object-cover"
              referrerPolicy="no-referrer"
              unoptimized={value.startsWith('http')}
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-xs font-medium">No image selected</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 bg-white"
            disabled={isCompressing}
            onClick={() => fileInputRef.current?.click()}
          >
            {isCompressing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload File
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 bg-white"
            disabled={isCompressing}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />
        </div>
        
        <p className="text-[10px] text-slate-400 text-center">
          Supports JPG, PNG. Max size 1MB (will be auto-compressed).
        </p>
      </div>
    </div>
  );
}
