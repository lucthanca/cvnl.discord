export type AIConfig = {
  model: string;
  apiKey: string;
}
export type AIAnswer = {
  [key: string]: string | number[] | boolean;
}