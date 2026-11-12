/** 只注册实际使用的图表能力，避免首次统计页加载整个 ECharts。 */
import { use, init, graphic } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export { init, graphic };
