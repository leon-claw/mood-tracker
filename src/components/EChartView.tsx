import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface EChartViewProps {
  option: EChartsCoreOption;
  className?: string;
}

export const EChartView = ({ option, className = 'h-[180px] w-full' }: EChartViewProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    chartRef.current = echarts.init(hostRef.current, undefined, { renderer: 'canvas' });
    const resizeObserver = new ResizeObserver(() => chartRef.current?.resize());
    resizeObserver.observe(hostRef.current);

    return () => {
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={hostRef} className={className} />;
};
