import React from 'react';
    import { Box, Typography } from '@mui/material';
    import { BankFile } from '../types';

    interface PreviewAreaProps {
      file: BankFile | null;
    }

    const PreviewArea: React.FC<PreviewAreaProps> = ({ file }) => {
      return (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            主预览区
          </Typography>
          {file ? (
            <pre>{JSON.stringify(file.rawData, null, 2)}</pre>
          ) : (
            <Typography>请选择一个文件进行预览</Typography>
          )}
        </Box>
      );
    };

    export default PreviewArea;
