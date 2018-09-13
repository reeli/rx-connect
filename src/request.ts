import {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import {
  endsWith,
  get,
} from "lodash";
import {
  Action,
  AnyAction,
} from "redux";

interface IRequestMetaConfig {
  shouldShowLoading?: boolean;
  omitError?: boolean;
}

interface IRequestMeta extends IRequestMetaConfig {
  request: true;
}

export interface IRequestAction extends Action {
  meta: IRequestMeta;
  payload: AxiosRequestConfig;
}

export interface IRequestStartAction extends Action {
  meta: {
    previousAction: IRequestAction;
  };
}

export interface IRequestSuccessAction extends Action {
  payload: AxiosResponse;
  meta: {
    previousAction: IRequestAction;
  };
}

export interface IRequestFailedAction extends Action {
  error: true;
  payload: AxiosError;
  meta: {
    previousAction: IRequestAction;
  };
}

const creator = (condition: boolean) => {
  return (action: AnyAction) => {
    return get(action.meta, "previousAction.meta.request") && condition;
  };
};

export const isRequestFailedAction = (action: AnyAction) => creator(endsWith(action.type, "_Failed"))(action);
export const isRequestSuccessAction = (action: AnyAction) => creator(endsWith(action.type, "_Success"))(action);
export const isRequestStartAction = (action: AnyAction) => creator(endsWith(action.type, "_Start"))(action);
