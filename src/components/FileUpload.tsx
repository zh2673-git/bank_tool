import React from 'react';
    import { Button } from '@mui/material';

    interface FileUploadProps {
      onUpload: (files: any[]) => void;
    }

    const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        // Process files and call onUpload
      };

      return (
        <div>
          <input
            accept=".csv,.xlsx,.xls,.pdf"
            style={{ display: 'none' }}
            id="upload-button"
            multiple
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="upload-button">
            <Button variant="contained" component="span">
              上传
            </Button>
          </label>
        </div>
      );
    };

    export default FileUpload;
