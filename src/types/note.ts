export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  updatedAt: string;
  pinned?: boolean;
};
