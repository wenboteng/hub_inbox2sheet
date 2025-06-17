declare module 'axios' {
  import { AxiosStatic } from 'axios';
  const axios: AxiosStatic;
  export default axios;
  export * from 'axios';
} 