'use client';

import * as React from 'react';

export type AdminTableColumn<T> = {
  /** 컬럼 ID */
  id: string;
  /** 헤더 텍스트 */
  header: React.ReactNode;
  /** 셀 렌더링 */
  render: (row: T, index: number) => React.ReactNode;
  /** 정렬 가능 여부 (기본 false) */
  sortable?: boolean;
  /** 헤더/셀에 적용할 className */
  className?: string;
  /** 셀 인라인 스타일 */
  cellStyle?: React.CSSProperties;
  /** 헤더 인라인 스타일 */
  headerStyle?: React.CSSProperties;
};

export type AdminTableSort = {
  columnId: string;
  direction: 'asc' | 'desc';
};

export type AdminTableProps<T> = {
  columns: AdminTableColumn<T>[];
  rows: T[];
  /** 행 키 (기본 index 사용) */
  rowKey?: (row: T, index: number) => string | number;
  /** 행 클래스 (예: 'warn-row', 'danger-row') */
  rowClassName?: (row: T) => string | undefined;
  /** 정렬 상태 */
  sort?: AdminTableSort;
  /** 정렬 변경 콜백 */
  onSortChange?: (columnId: string) => void;
  /** 로딩 상태 (스켈레톤 표시) */
  loading?: boolean;
  /** 스켈레톤 행 수 (기본 5) */
  skeletonRows?: number;
  /** 빈 상태 메시지 */
  emptyMessage?: React.ReactNode;
  /** 행 클릭 핸들러 */
  onRowClick?: (row: T) => void;
  /** 확장된 행의 키 (renderExpandedRow와 함께 사용) */
  expandedRowKey?: string | number | null;
  /** 확장 행 콘텐츠 렌더 — 해당 행 바로 아래 colSpan 전체 폭으로 표시 */
  renderExpandedRow?: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * Pattern F V1 — 어드민 테이블 (제네릭).
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1 adm-table
 *
 * 사용 예:
 *   <AdminTable
 *     columns={[
 *       { id: 'name', header: '학원명', render: t => <b>{t.name}</b>, sortable: true },
 *       { id: 'students', header: '학생', render: t => t.studentCount },
 *     ]}
 *     rows={tenants}
 *     sort={{ columnId: 'name', direction: 'asc' }}
 *     onSortChange={(id) => ...}
 *   />
 */
export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  sort,
  onSortChange,
  loading = false,
  skeletonRows = 5,
  emptyMessage = '표시할 데이터가 없습니다.',
  onRowClick,
  expandedRowKey,
  renderExpandedRow,
  className,
}: AdminTableProps<T>) {
  const classes = ['adm-table'];
  if (className) classes.push(className);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={classes.join(' ')}>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.columnId === col.id;
              const thClass = [];
              if (col.sortable) thClass.push('sortable');
              if (col.className) thClass.push(col.className);
              return (
                <th
                  key={col.id}
                  className={thClass.join(' ')}
                  style={col.headerStyle}
                  onClick={col.sortable && onSortChange ? () => onSortChange(col.id) : undefined}
                >
                  {col.header}
                  {col.sortable && active && (
                    <span className="sort">{sort?.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skel-${i}`} className="adm-skeleton-row">
                {columns.map((c) => (
                  <td key={c.id}>
                    <span className="skel" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="adm-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const key = rowKey ? rowKey(row, i) : i;
              const extraClass = rowClassName?.(row);
              const isExpanded =
                expandedRowKey != null && key === expandedRowKey && !!renderExpandedRow;
              return (
                <React.Fragment key={key}>
                  <tr
                    className={extraClass}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={col.className}
                        style={col.cellStyle}
                      >
                        {col.render(row, i)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && (
                    <tr className="adm-expanded-row">
                      <td colSpan={columns.length} style={{ padding: 0 }}>
                        {renderExpandedRow!(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
