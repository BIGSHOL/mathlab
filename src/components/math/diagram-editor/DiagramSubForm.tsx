'use client';

import React from 'react';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { SubFormProps } from './types';
import {
  FractionRectForm, FractionCircleForm, NumberLineForm,
  PlaceValueForm, DotArrayForm, FlowChartForm,
  BarChartForm, LineGraphForm, PictureGraphForm,
  PieChartForm, BandChartForm, AngleFigureForm, ClockFaceForm,
} from './ElementaryEditors';
import {
  CoordinatePlaneForm, TriangleForm, QuadrilateralForm,
  CircleForm, FunctionGraphForm, VennDiagramForm,
  RegularPolygonForm, HistogramForm, StemLeafForm,
  SolidFigureForm, NetDiagramForm, TreeDiagramForm, ScatterPlotForm,
} from './MiddleEditors';
import { PolygonForm } from './PolygonForm';

export function DiagramSubForm({ type, params, onChange }: { type: DiagramType } & SubFormProps) {
  switch (type) {
    case 'fraction_rect': return <FractionRectForm params={params} onChange={onChange} />;
    case 'fraction_circle': return <FractionCircleForm params={params} onChange={onChange} />;
    case 'number_line': return <NumberLineForm params={params} onChange={onChange} />;
    case 'place_value': return <PlaceValueForm params={params} onChange={onChange} />;
    case 'dot_array': return <DotArrayForm params={params} onChange={onChange} />;
    case 'flow_chart': return <FlowChartForm params={params} onChange={onChange} />;
    case 'bar_chart': return <BarChartForm params={params} onChange={onChange} />;
    case 'line_graph': return <LineGraphForm params={params} onChange={onChange} />;
    case 'picture_graph': return <PictureGraphForm params={params} onChange={onChange} />;
    case 'pie_chart': return <PieChartForm params={params} onChange={onChange} />;
    case 'band_chart': return <BandChartForm params={params} onChange={onChange} />;
    case 'angle_figure': return <AngleFigureForm params={params} onChange={onChange} />;
    case 'clock_face': return <ClockFaceForm params={params} onChange={onChange} />;
    case 'coordinate_plane': return <CoordinatePlaneForm params={params} onChange={onChange} />;
    case 'triangle': return <TriangleForm params={params} onChange={onChange} />;
    case 'quadrilateral': return <QuadrilateralForm params={params} onChange={onChange} />;
    case 'polygon': return <PolygonForm params={params} onChange={onChange} />;
    case 'circle': return <CircleForm params={params} onChange={onChange} />;
    case 'function_graph': return <FunctionGraphForm params={params} onChange={onChange} />;
    case 'venn_diagram': return <VennDiagramForm params={params} onChange={onChange} />;
    case 'regular_polygon': return <RegularPolygonForm params={params} onChange={onChange} />;
    case 'histogram': return <HistogramForm params={params} onChange={onChange} />;
    case 'stem_leaf': return <StemLeafForm params={params} onChange={onChange} />;
    case 'solid_figure': return <SolidFigureForm params={params} onChange={onChange} />;
    case 'net_diagram': return <NetDiagramForm params={params} onChange={onChange} />;
    case 'tree_diagram': return <TreeDiagramForm params={params} onChange={onChange} />;
    case 'scatter_plot': return <ScatterPlotForm params={params} onChange={onChange} />;
    default: return <p className="text-xs text-slate-400">지원하지 않는 타입입니다.</p>;
  }
}
