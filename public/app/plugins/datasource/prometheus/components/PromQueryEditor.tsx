import _ from 'lodash';
import React, { PureComponent } from 'react';
import { hot } from 'react-hot-loader';

// Types
import { FormLabel, Select, SelectOptionItem, Switch } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/ui/src/types';
import { PrometheusDatasource } from '../datasource';
import { PromQuery } from '../types';

import PromQueryField from './PromQueryField';

type Props = QueryEditorProps<PrometheusDatasource, PromQuery>;

const FORMAT_OPTIONS: SelectOptionItem[] = [
  { label: 'Time series', value: 'time_series' },
  { label: 'Table', value: 'table' },
  { label: 'Heatmap', value: 'heatmap' },
];

const INTERVAL_FACTOR_OPTIONS: SelectOptionItem[] = _.map([1, 2, 3, 4, 5, 10], (value: number) => ({
  value,
  label: '1/' + value,
}));

interface State {
  legendFormat: string;
  formatOption: SelectOptionItem;
  interval: string;
  intervalFactorOption: SelectOptionItem;
  instant: boolean;
}

export class PromQueryEditor extends PureComponent<Props, State> {
  // Query target to be modified and used for queries
  query: PromQuery;

  constructor(props: Props) {
    super(props);
    const { query } = props;
    this.query = query;
    // Query target properties that are fullu controlled inputs
    this.state = {
      // Fully controlled text inputs
      interval: query.interval,
      legendFormat: query.legendFormat,
      // Select options
      formatOption: FORMAT_OPTIONS.find(option => option.value === query.format) || FORMAT_OPTIONS[0],
      intervalFactorOption:
        INTERVAL_FACTOR_OPTIONS.find(option => option.value === query.intervalFactor) || INTERVAL_FACTOR_OPTIONS[0],
      // Switch options
      instant: Boolean(query.instant),
    };
  }

  onFieldChange = (query: PromQuery, override?) => {
    this.query.expr = query.expr;
  };

  onFormatChange = (option: SelectOptionItem) => {
    this.query.format = option.value;
    this.setState({ formatOption: option }, this.onRunQuery);
  };

  onInstantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const instant = e.target.checked;
    this.query.instant = instant;
    this.setState({ instant }, this.onRunQuery);
  };

  onIntervalChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const interval = e.currentTarget.value;
    this.query.interval = interval;
    this.setState({ interval });
  };

  onIntervalFactorChange = (option: SelectOptionItem) => {
    this.query.intervalFactor = option.value;
    this.setState({ intervalFactorOption: option }, this.onRunQuery);
  };

  onLegendChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const legendFormat = e.currentTarget.value;
    this.query.legendFormat = legendFormat;
    this.setState({ legendFormat });
  };

  onRunQuery = () => {
    const { query } = this;
    this.props.onChange(query);
    this.props.onRunQuery();
  };

  getExternalLink(): string {
    const { datasource, panel, range } = this.props;
    if (!range) {
      return null;
    }

    const rangeDiff = Math.ceil((range.to.valueOf() - range.from.valueOf()) / 1000);
    const endTime = range.to.utc().format('YYYY-MM-DD HH:mm');
    const options = {
      // TODO Should be the dynamically calculated interval from the panel ctrl
      interval: datasource.interval,
      scopedVars: panel.scopedVars,
    };
    // TODO update expr when template variables change
    const query = datasource.createQuery(this.query, options, range.from.valueOf(), range.to.valueOf());
    const expr = {
      'g0.expr': query.expr,
      'g0.range_input': rangeDiff + 's',
      'g0.end_input': endTime,
      'g0.step_input': query.step,
      'g0.tab': 0,
    };

    const args = _.map(expr, (v, k) => {
      return k + '=' + encodeURIComponent(v);
    }).join('&');
    return `${datasource.directUrl}/graph?${args}`;
  }

  render() {
    const { datasource, query } = this.props;
    const { formatOption, instant, interval, intervalFactorOption, legendFormat } = this.state;
    const externalLink = this.getExternalLink();

    return (
      <div>
        <div className="gf-form-input" style={{ height: 'initial' }}>
          <PromQueryField
            datasource={datasource}
            query={query}
            onQueryChange={this.onFieldChange}
            onExecuteQuery={this.onRunQuery}
            history={[]}
          />
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <FormLabel width={7} tooltip="Controls the name of the time series, using name or pattern. For example
        {{hostname}} will be replaced with label value for the label hostname.">Legend</FormLabel>
            <input
              type="text"
              className="gf-form-input"
              placeholder="legend format"
              value={legendFormat}
              onChange={this.onLegendChange}
            />
          </div>

          <div className="gf-form">
            <FormLabel width={7} tooltip="Leave blank for auto handling based on time range and panel width.
            Note that the actual dates used in the query will be adjusted
        to a multiple of the interval step.">Min step</FormLabel>
            <input
              type="text"
              className="gf-form-input width-8"
              placeholder={interval}
              onChange={this.onIntervalChange}
              value={interval}
            />
          </div>

          <div className="gf-form">
            <div className="gf-form-label">Resolution</div>
            <Select
              isSearchable={false}
              options={INTERVAL_FACTOR_OPTIONS}
              onChange={this.onIntervalFactorChange}
              value={intervalFactorOption}
            />
          </div>

          <div className="gf-form">
            <div className="gf-form-label">Format</div>
            <Select isSearchable={false} options={FORMAT_OPTIONS} onChange={this.onFormatChange} value={formatOption} />
            <Switch label="Instant" checked={instant} onChange={this.onInstantChange} />

            {externalLink && <FormLabel width={10} tooltip="Link to Graph in Prometheus">
              <a href={externalLink} target="_blank">
              <i className="fa fa-share-square-o" /> Prometheus
              </a>
            </FormLabel>}
          </div>
        </div>
      </div>
    );
  }
}

export default hot(module)(PromQueryEditor);
