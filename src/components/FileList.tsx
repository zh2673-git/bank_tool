import React from 'react';
    import { DataGrid, GridColDef } from '@mui/x-data-grid';

    const columns: GridColDef[] = [
      { field: 'id', headerName: '序号', width: 70 },
      { field: 'name', headerName: '文件号', width: 200 },
      { field: 'size', headerName: '文件大小', width: 120 },
      { 
        field: 'actions', 
        headerName: '操作', 
        width: 300,
        renderCell: () => (
          <>
            <Button>预览</Button>
            <Button>字段映射</Button>
            <Button>删除</Button>
          </>
        )
      }
    ];

    interface FileListProps {
      files: any[];
      onSelect: (file: any) => void;
    }

    const FileList: React.FC<FileListProps> = ({ files, onSelect }) => {
      return (
        <div style={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={files}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            onRowClick={(params) => onSelect(params.row)}
          />
        </div>
      );
    };

    export default FileList;
