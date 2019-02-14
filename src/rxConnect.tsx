import React, { Component } from "react";
import { connect } from "react-redux";
import { AnyAction } from "redux";
import { Subject } from "rxjs/internal/Subject";
import { Subscription } from "rxjs/internal/Subscription";
import { filter, tap } from "rxjs/operators";
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
      subscriptions: Subscription[] | null = null;
      dispatch = (action: IRequestAction) => {
        const sub$ = new Subject<AnyAction>();
        const subscription = this.props.dispatch(sub$);

        sub$
          .pipe(
            filter(
              (requestAction) =>
                (isRequestSuccessAction(requestAction) || isRequestFailedAction(requestAction)) &&
                requestAction.meta.previousAction.type === action.type &&
                requestAction.meta.previousAction.payload === action.payload, // 当 request 去重之后，只有一个 requestSuccessAction 被 dispatch，如果在同一个页面 dispatch 了两个完全相同的 action（两个 action 是不同的引用），并且注册了两个 success callback，那么只有第一个 action 的 success callback 会被执行，所以这里可以考虑使用 `isEqual`，而不是直接比较引用。（现在没有问题是因为我们用 store 来共享请求的数据）
            ),
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
          .subscribe(() => {
            // 每一次 request 完成之后，清理 Observable 执行，避免浪费计算能力或者内存资源。如果等到组件 unmount 时再清理，那么当页面上有极大量的 dispatch 时，可能会出现问题。
            subscription.unsubscribe();
          });

        // 如果一个页面上调用多次 dispatch，会生成多个 subscription。应该将这些 subscription 存起来，在组件销毁的时候全部 unsubscribe。（之前的问题：只会有最后一个会被 unsubscribe）
        this.props.subscriptions.push(subscription);

        // dispatch(action) 必须在 dispatch(sub$) 后面。因为 dispatch(sub$) 才会给 rootSubject$ 注册观察者。
        // dispatch(action) 之后，rootSubject.next(action) 会被调用，此时如果观察者还没有被注册，那么这条消息也就无法通知给观察者。
        this.props.dispatch(action);
        return subscription;
      };

      componentWillUnmount() {
        // 每一次 request 完成之后都清理了 Observable 执行，那么在组件销毁时还需要再次清理吗？需要，因为有可能出现请求还没有完成，但是组件已经被销毁的情况。（比如极快的从 A 页面切到 B 页面）
        if (this.subscriptions) {
          this.subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
          });
        }
      }

      render() {
        return <Comp {...this.props} dispatch={this.dispatch} />;
      }
    }

    return (connect as any)(...args)(C);
  };
};
