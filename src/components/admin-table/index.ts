/**
 * Pattern F — 어드민 테이블 컴포넌트 barrel export.
 *
 * 디자인 패턴: design/handoff/02-PAGE-MANIFEST.md § W3 (Pattern F)
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1
 *
 * 대상 페이지:
 *   - 2.1 /admin/tenants (V1 + admin-tenants.html)
 *   - 2.2 /admin/schools (V1)
 *   - 2.3 /admin/teachers (V1)
 */

export { AdminTopbar } from './AdminTopbar';
export type { AdminTopbarProps } from './AdminTopbar';

export { AdminFilterBar, AdminAppliedChips } from './AdminFilterBar';
export type {
  AdminFilterBarProps,
  AdminFilter,
  AdminFilterOption,
  AdminAppliedChipsProps,
  AppliedChip,
} from './AdminFilterBar';

export { AdminTable } from './AdminTable';
export type {
  AdminTableProps,
  AdminTableColumn,
  AdminTableSort,
} from './AdminTable';

export { AdminPagination } from './AdminPagination';
export type { AdminPaginationProps } from './AdminPagination';

export { AdminStatsRow } from './AdminStatsRow';
export type { AdminStatsRowProps, AdminStatItem } from './AdminStatsRow';
