export interface IProject {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  context?: string;
  assets?: {
    _id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    context?: string;
    storageName?: string;
  }[];
}
