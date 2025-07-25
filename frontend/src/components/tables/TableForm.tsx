import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Divider,
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { CreateTableRequest, CreateFieldRequest } from '../../services/tableService';

interface TableFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTableRequest) => void;
  initialValues?: {
    name: string;
    description?: string;
  };
  isLoading: boolean;
  title: string;
  submitLabel: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  description: Yup.string(),
  fields: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Field name is required'),
      type: Yup.string().required('Field type is required'),
      required: Yup.boolean(),
      description: Yup.string(),
    })
  ),
});

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'singleSelect', label: 'Single Select' },
  { value: 'multiSelect', label: 'Multi Select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
];

const TableForm: React.FC<TableFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues = { name: '', description: '' },
  isLoading,
  title,
  submitLabel,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formik = useFormik({
    initialValues: {
      ...initialValues,
      fields: [
        { name: 'Name', type: 'text', required: true, description: '' },
        { name: 'Notes', type: 'text', required: false, description: '' },
      ],
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  const addField = () => {
    formik.setFieldValue('fields', [
      ...formik.values.fields,
      { name: '', type: 'text', required: false, description: '' },
    ]);
  };

  const removeField = (index: number) => {
    const newFields = [...formik.values.fields];
    newFields.splice(index, 1);
    formik.setFieldValue('fields', newFields);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Table Name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
            margin="normal"
            disabled={isLoading}
            autoFocus
          />
          <TextField
            fullWidth
            id="description"
            name="description"
            label="Description (Optional)"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={formik.touched.description && formik.errors.description}
            margin="normal"
            multiline
            rows={2}
            disabled={isLoading}
          />

          <Box sx={{ mt: 3, mb: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </Button>
          </Box>

          {showAdvanced && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Fields
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Define the fields for your table. You can add more fields later.
              </Typography>

              {formik.values.fields.map((field, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <TextField
                    id={`fields[${index}].name`}
                    name={`fields[${index}].name`}
                    label="Field Name"
                    value={field.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.fields?.[index]?.name &&
                      Boolean(formik.errors.fields?.[index]?.name)
                    }
                    helperText={
                      formik.touched.fields?.[index]?.name &&
                      formik.errors.fields?.[index]?.name
                    }
                    sx={{ flexGrow: 1 }}
                    disabled={isLoading}
                  />

                  <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel id={`fields[${index}].type-label`}>Type</InputLabel>
                    <Select
                      labelId={`fields[${index}].type-label`}
                      id={`fields[${index}].type`}
                      name={`fields[${index}].type`}
                      value={field.type}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label="Type"
                      disabled={isLoading}
                    >
                      {fieldTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.fields?.[index]?.type &&
                      formik.errors.fields?.[index]?.type && (
                        <FormHelperText error>
                          {formik.errors.fields?.[index]?.type as string}
                        </FormHelperText>
                      )}
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Checkbox
                        id={`fields[${index}].required`}
                        name={`fields[${index}].required`}
                        checked={field.required}
                        onChange={formik.handleChange}
                        disabled={isLoading}
                      />
                    }
                    label="Required"
                  />

                  {index > 1 && (
                    <IconButton
                      onClick={() => removeField(index)}
                      disabled={isLoading}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addField}
                disabled={isLoading}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Field
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading || !formik.isValid}
          >
            {isLoading ? <CircularProgress size={24} /> : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TableForm;