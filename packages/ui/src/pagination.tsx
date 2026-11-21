"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { cn } from "./lib/utils";

type PaginationLabels = {
  more: string;
  navigation: string;
  next: string;
  page: (page: number) => string;
  pageSummary: (page: number, totalPages: number) => string;
  previous: string;
};

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

type PaginationProps = Omit<ComponentProps<"nav">, "onChange"> & {
  disabled?: boolean;
  labels: PaginationLabels;
  onPageChange: (page: number) => void;
  page: number;
  siblingCount?: number;
  totalPages: number;
};

export function getPaginationItems(
  page: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safePage = Math.min(Math.max(1, Math.floor(page)), safeTotal);
  const safeSiblingCount = Math.max(0, Math.floor(siblingCount));
  const visibleSlots = safeSiblingCount * 2 + 5;

  if (safeTotal <= visibleSlots) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const leftSibling = Math.max(safePage - safeSiblingCount, 1);
  const rightSibling = Math.min(safePage + safeSiblingCount, safeTotal);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < safeTotal - 1;
  const sideItemCount = 3 + safeSiblingCount * 2;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [
      ...Array.from({ length: sideItemCount }, (_, index) => index + 1),
      "ellipsis-right",
      safeTotal,
    ];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const firstPage = safeTotal - sideItemCount + 1;
    return [
      1,
      "ellipsis-left",
      ...Array.from({ length: sideItemCount }, (_, index) => firstPage + index),
    ];
  }

  return [
    1,
    "ellipsis-left",
    ...Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, index) => leftSibling + index,
    ),
    "ellipsis-right",
    safeTotal,
  ];
}

export function Pagination({
  className,
  disabled = false,
  labels,
  onPageChange,
  page,
  siblingCount = 1,
  totalPages,
  ...props
}: PaginationProps) {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safePage = Math.min(Math.max(1, Math.floor(page)), safeTotal);
  const items = getPaginationItems(safePage, safeTotal, siblingCount);

  return (
    <nav
      aria-label={labels.navigation}
      className={cn("flex justify-center", className)}
      {...props}
    >
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <Button
            aria-label={labels.previous}
            className="size-9"
            disabled={disabled || safePage === 1}
            onClick={() => onPageChange(safePage - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
        </li>

        <li className="px-2 text-sm font-medium text-foreground sm:hidden">
          {labels.pageSummary(safePage, safeTotal)}
        </li>

        {items.map((item) =>
          typeof item === "number" ? (
            <li className="hidden sm:block" key={item}>
              <Button
                aria-current={item === safePage ? "page" : undefined}
                aria-label={labels.page(item)}
                className="min-w-9 px-2"
                disabled={disabled}
                onClick={() => onPageChange(item)}
                size="sm"
                type="button"
                variant={item === safePage ? "primary" : "ghost"}
              >
                {item}
              </Button>
            </li>
          ) : (
            <li
              aria-hidden="true"
              className="hidden size-9 items-center justify-center text-muted-foreground sm:flex"
              key={item}
              title={labels.more}
            >
              <MoreHorizontal className="size-4" />
            </li>
          ),
        )}

        <li>
          <Button
            aria-label={labels.next}
            className="size-9"
            disabled={disabled || safePage === safeTotal}
            onClick={() => onPageChange(safePage + 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}

export type { PaginationLabels, PaginationProps };
