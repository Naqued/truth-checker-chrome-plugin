import * as React from 'react';
import * as ReactDOM from 'react-dom';

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
} 