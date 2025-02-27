import React, { useState } from 'react';
    import { Box, Typography, Button, Container, Grid } from '@mui/material';
    import FileUpload from './components/FileUpload';
    import FileList from './components/FileList';
    import PreviewArea from './components/PreviewArea';
    import ActionPanel from './components/ActionPanel';
    import { BankFile } from './types';

    const App: React.FC = () => {
      const [files, setFiles] = useState<BankFile[]>([]);
      const [selectedFile, setSelectedFile] = useState<BankFile | null>(null);

      const handleFileUpload = (newFiles: BankFile[]) => {
        setFiles(prev => [...prev, ...newFiles]);
      };

      return (
        <Container maxWidth="xl">
          <Box sx={{ my: 4 }}>
            <Typography variant="h3" gutterBottom>
              银行清洗分析工具
            </Typography>
            
            <FileUpload onUpload={handleFileUpload} />
            
            <Grid container spacing={3}>
              <Grid item xs={8}>
                <FileList 
                  files={files} 
                  onSelect={setSelectedFile} 
                />
                <PreviewArea file={selectedFile} />
              </Grid>
              <Grid item xs={4}>
                <ActionPanel />
              </Grid>
            </Grid>
          </Box>
        </Container>
      );
    };

    export default App;
