import React from 'react';
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
} from '@mui/material';
import { CreateBaseRequest, UpdateBaseRequest } from '../../services/baseService';

interface BaseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBaseRequest | UpdateBaseRequest) => void;
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
});

const BaseForm: React.FC<BaseFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues = { name: '', description: '' },
  isLoading,
  title,
  submitLabel,
}) => {
  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            id="name"
            name="name"
            label="Base Name"
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
            rows={3}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading || !formik.isValid || !formik.dirty}
          >
            {isLoading ? <CircularProgress size={24} /> : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BaseForm;