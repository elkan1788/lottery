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

export type PrizeFilters = {
  status?: "all" | "active" | "inactive";
  sort?: "tier-asc" | "tier-desc" | "stock-desc" | "stock-asc" | "updated-desc";
  keyword?: string;
};

export type WinnerFilters = {
  keyword?: string;
  tier?: number;
  limit?: number;
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
