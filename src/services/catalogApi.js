import api from './axiosInstance';
export const getBoxSizes        = ()           => api.get('/catalog/box-sizes');
export const getShowcaseDesigns = (categoryId) =>
  api.get('/catalog/showcase-designs', { params: categoryId ? { categoryId } : {} });
export const getCategories      = ()           => api.get('/catalog/categories');
