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
/* eslint-disable no-param-reassign */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppSection,
  DataMask,
  ensureIsArray,
  ExtraFormData,
  GenericDataType,
  getColumnLabel,
  JsonObject,
  finestTemporalGrainFormatter,
  t,
  // tn,
} from '@superset-ui/core';
import { useImmerReducer } from 'use-immer';
import { PluginFilterSelectProps, SelectValue } from './types';
import { FilterPluginStyle, StatusMessage, StyledFormItem } from '../common';
import { getDataRecordFormatter, getSelectV4ExtraFormData } from '../../utils';
import { DatePicker } from 'antd';
import moment, { Moment } from 'moment';
import { RangePickerProps } from 'antd/lib/date-picker';

type DataMaskAction =
  | { type: 'ownState'; ownState: JsonObject }
  | {
      type: 'filterState';
      extraFormData: ExtraFormData;
      filterState: { value: SelectValue; label?: string };
    };

function reducer(draft: DataMask, action: DataMaskAction) {
  switch (action.type) {
    case 'ownState':
      draft.ownState = {
        ...draft.ownState,
        ...action.ownState,
      };
      return draft;
    case 'filterState':
      if (
        JSON.stringify(draft.extraFormData) !==
        JSON.stringify(action.extraFormData)
      ) {
        draft.extraFormData = action.extraFormData;
      }
      if (
        JSON.stringify(draft.filterState) !== JSON.stringify(action.filterState)
      ) {
        draft.filterState = { ...draft.filterState, ...action.filterState };
      }

      return draft;
    default:
      return draft;
  }
}

export default function PluginFilterSelect(props: PluginFilterSelectProps) {
  const {
    maxDate,
    minDate,
    coltypeMap,
    data,
    filterState,
    formData,
    height,
    width,
    setDataMask,
    appSection,
  } = props;

  const {
    enableEmptyFilter,
    inverseSelection,
    defaultToFirstItem,
    shouldDisabled,
  } = formData;

  const dateFormat = 'YYYY-MM-DD';
  const { RangePicker } = DatePicker;

  const groupby = useMemo(
    () => ensureIsArray(formData.groupby).map(getColumnLabel),
    [formData.groupby],
  );
  const [col] = groupby;
  const [selectedMomentDate, setSelectedMomentDate] = useState<
    [Moment | null, Moment | null]
  >([
    moment(filterState?.value?.[0], dateFormat),
    moment(filterState?.value?.[1], dateFormat),
  ]);
  const [dataMask, dispatchDataMask] = useImmerReducer(reducer, {
    extraFormData: {},
    filterState,
  });
  const datatype: GenericDataType = coltypeMap[col];
  const labelFormatter = useMemo(
    () =>
      getDataRecordFormatter({
        timeFormatter: finestTemporalGrainFormatter(data.map(el => el[col])),
      }),
    [data, col],
  );

  const updateDataMask = useCallback(
    (values: SelectValue) => {
      const emptyFilter =
        enableEmptyFilter && !inverseSelection && !values?.length;

      const suffix = inverseSelection && values?.length ? t(' (excluded)') : '';

      dispatchDataMask({
        type: 'filterState',
        extraFormData: getSelectV4ExtraFormData(
          col,
          values,
          emptyFilter,
          inverseSelection,
        ),
        filterState: {
          ...filterState,
          label: values?.length
            ? `${(values || [])
                .map(value => labelFormatter(value, datatype))
                .join(', ')}${suffix}`
            : undefined,
          value:
            appSection === AppSection.FilterConfigModal && defaultToFirstItem
              ? undefined
              : values,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      appSection,
      col,
      datatype,
      defaultToFirstItem,
      dispatchDataMask,
      enableEmptyFilter,
      inverseSelection,
      JSON.stringify(filterState),
      labelFormatter,
    ],
  );

  const isDisabled =
    appSection === AppSection.FilterConfigModal && defaultToFirstItem;

  const handleChange = useCallback(
    (value?: SelectValue | number | string) => {
      const values = value === null ? [null] : ensureIsArray(value);

      if (values.length === 0) {
        updateDataMask(null);
      } else {
        updateDataMask(values);
      }
    },
    [updateDataMask],
  );

  const formItemExtra = useMemo(() => {
    if (filterState.validateMessage) {
      return (
        <StatusMessage status={filterState.validateStatus}>
          {filterState.validateMessage}
        </StatusMessage>
      );
    }
    return undefined;
  }, [filterState.validateMessage, filterState.validateStatus]);

  useEffect(() => {
    if (defaultToFirstItem && filterState.value === undefined) {
      const firstItem: SelectValue = data[0]
        ? (groupby.map(col => data[0][col]) as string[])
        : null;
      // TODO: still need repopulate default value in config modal when column changed
      if (firstItem?.[0] !== undefined) {
        updateDataMask(firstItem);
      }
    } else if (isDisabled) {
      updateDataMask(null);
    } else {
      // reset data mask based on filter state
      updateDataMask(filterState.value);
      setSelectedMomentDate([
        filterState?.value?.[0]
          ? moment(filterState.value[0], dateFormat)
          : null,
        filterState?.value?.[1]
          ? moment(filterState.value[1], dateFormat)
          : null,
      ]);
    }
  }, [
    col,
    isDisabled,
    defaultToFirstItem,
    enableEmptyFilter,
    inverseSelection,
    updateDataMask,
    data,
    groupby,
    JSON.stringify(filterState.value),
  ]);

  useEffect(() => {
    setDataMask(dataMask);
  }, [JSON.stringify(dataMask)]);

  const handleDateChange: RangePickerProps['onChange'] = (date, dateString) => {
    console.log('handleDateChange', {
      date,
      dateString,
    });
    if (date) {
      setSelectedMomentDate(date);
      handleChange(dateString);
    }
    // If date is null, we clear the filter
    else {
      setSelectedMomentDate([null, null]);
      handleChange(null);
    }
  };

  // Define the date range you want to allow
  const minMomentDate = moment(minDate, dateFormat);
  const maxMomentDate = moment(maxDate, dateFormat);

  // Function to disable dates outside the range
  const disabledDate = (current: any) => {
    return current && (current < minMomentDate || current > maxMomentDate);
  };

  return (
    <FilterPluginStyle height={height} width={width}>
      <StyledFormItem
        validateStatus={filterState.validateStatus}
        extra={formItemExtra}
      >
        <RangePicker
          style={{
            width: '100%',
          }}
          value={selectedMomentDate}
          onChange={handleDateChange}
          disabledDate={shouldDisabled ? disabledDate : undefined}
          allowClear
        />
      </StyledFormItem>
    </FilterPluginStyle>
  );
}
