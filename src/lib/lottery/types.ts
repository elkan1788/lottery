export type PrizeListItem = {
  id: number;
  name: string;
  tier: number;
  probabilityWeight: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WinnerListItem = {
  id: number;
  nickname: string;
  prizeName: string;
  tier: number;
  wonAt: Date;
};

export type DrawResult =
  | {
      status: "success";
      winner: WinnerListItem;
      prize: PrizeListItem;
    }
  | {
      status: "ended";
      message: string;
    };
