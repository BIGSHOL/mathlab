import type { DiagramPlugin } from '../../types';
import type { FunctionGraphParams } from '@/lib/utils/svg-diagrams/types';
import { renderFunctionGraph } from '@/lib/utils/svg-diagrams/middle/function-graph';

export const functionGraphPlugin: DiagramPlugin<FunctionGraphParams> = {
  type: 'function_graph',
  normalize: (p) => p as unknown as FunctionGraphParams,
  render: renderFunctionGraph,
};
