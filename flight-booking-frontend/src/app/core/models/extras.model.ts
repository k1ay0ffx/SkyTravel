export type ExtraType = 'baggage' | 'meal' | 'insurance' | 'carry_on';

export interface Extra {
  id: number;
  type: ExtraType;
  name: string;
  description: string;
  price: number;
}
