/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { GenericDataType } from '@superset-ui/core';
import { noOp } from 'src/utils/common';
import { DEFAULT_FORM_DATA, PluginFilterSelectChartProps } from './types';

function getMinMaxDates(data: any[], dateKey: string) {
  if (data.length === 0) {
    return { minDate: null, maxDate: null };
  }

  // Define a default timestamp (e.g., current date)
  const defaultTimestamp = new Date().getTime();

  // Extract all the dates using the dynamic key, using default timestamp if value is a string
  const dates = data.map(item => {
    const value = item[dateKey];
    return typeof value === 'string' ? defaultTimestamp : value;
  });

  // Find the minimum and maximum dates
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return {
    minDate: minDate.toISOString().split('T')[0], // Format as 'YYYY-MM-DD'
    maxDate: maxDate.toISOString().split('T')[0], // Format as 'YYYY-MM-DD'
  };
}

export default function transformProps(
  chartProps: PluginFilterSelectChartProps,
) {
  const {
    formData,
    height,
    hooks,
    queriesData,
    width,
    displaySettings,
    behaviors,
    appSection,
    filterState,
    isRefreshing,
    inputRef,
  } = chartProps;
  const newFormData = { ...DEFAULT_FORM_DATA, ...formData };
  const { shouldDisabled } = formData;
  const {
    setDataMask = noOp,
    setHoveredFilter = noOp,
    unsetHoveredFilter = noOp,
    setFocusedFilter = noOp,
    unsetFocusedFilter = noOp,
    setFilterActive = noOp,
  } = hooks;
  const [queryData] = queriesData;
  const { colnames = [], coltypes = [], data = [] } = queryData || {};
  const coltypeMap: Record<string, GenericDataType> = colnames.reduce(
    (accumulator, item, index) => ({ ...accumulator, [item]: coltypes[index] }),
    {},
  );

  const dateKey = queryData.colnames[0]; // This is dynamic
  // console.log(data);
  const { minDate, maxDate } = shouldDisabled
    ? getMinMaxDates(data, dateKey)
    : { minDate: null, maxDate: null };
  console.log(`Min Date: ${minDate}, Max Date: ${maxDate}`);

  return {
    minDate,
    maxDate,
    filterState,
    coltypeMap,
    appSection,
    width,
    behaviors,
    height,
    data,
    formData: newFormData,
    isRefreshing,
    setDataMask,
    setHoveredFilter,
    unsetHoveredFilter,
    setFocusedFilter,
    unsetFocusedFilter,
    setFilterActive,
    inputRef,
    filterBarOrientation: displaySettings?.filterBarOrientation,
    isOverflowingFilterBar: displaySettings?.isOverflowingFilterBar,
  };
}
