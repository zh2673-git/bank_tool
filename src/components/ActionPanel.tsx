import React from 'react';
    import { Box, Typography, Button } from '@mui/material';

    const ActionPanel: React.FC = () => {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            数据清洗
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" sx={{ mr: 1 }}>
              初步清洗
            </Button>
            <Button variant="contained">深度清洗</Button>
          </Box>

          <Typography variant="h6" gutterBottom>
            数据分析
          </Typography>
          <Box>
            <Button variant="contained" sx={{ mr: 1 }}>
              转账分析
            </Button>
            <Button variant="contained">现金分析</Button>
          </Box>
        </Box>
      );
    };

    export default ActionPanel;
