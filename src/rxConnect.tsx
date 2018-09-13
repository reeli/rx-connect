import React, { Component } from "react";
import { connect } from "react-redux";
import { AnyAction } from "redux";
import { Subject } from "rxjs/internal/Subject";
import { Subscription } from "rxjs/internal/Subscription";
import {
  filter,
  tap,
} from "rxjs/operators";
import {
  IRequestAction,
  IRequestFailedAction,
  IRequestSuccessAction,
  isRequestFailedAction,
  isRequestSuccessAction,
} from "./request";

export interface IRequestCallbacks {
  success?: (action: IRequestSuccessAction) => any;
  failed?: (action: IRequestFailedAction) => any;
}

export const rxConnect: typeof connect = (...args: any[]) => {
  return (Comp: React.ComponentType<any>) => {
    class C extends Component<any> {
      subscription: Subscription | null = null;
      dispatch = (action: IRequestAction) => {
        this.props.dispatch(action);
        const sub$ = new Subject<AnyAction>();
        this.subscription = sub$
          .pipe(
            filter((requestAction) => {
              return isRequestSuccessAction(requestAction) || isRequestFailedAction(requestAction);
            }),
            tap((requestAction) => {
              const isSuccessAction = requestAction.type === `${action.type}_Success`;
              const isFailedAction = requestAction.type === `${action.type}_Failed`;
              const { success, failed } = action.meta as IRequestCallbacks;
              if (success && isSuccessAction) {
                success(requestAction as IRequestSuccessAction);
              } else if (failed && isFailedAction) {
                failed(requestAction as IRequestFailedAction);
              }
            }),
          )
          .subscribe();
        this.props.dispatch(sub$);
      };

      componentWillMount() {
        if (this.subscription) {
          this.subscription.unsubscribe();
        }
      }

      render() {
        return <Comp {...this.props} dispatch={this.dispatch} />;
      }
    }

    return (connect as any)(...args)(C);
  };
};
