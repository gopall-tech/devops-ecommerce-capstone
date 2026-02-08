// AWS X-Ray Tracing Configuration for Node.js Services
// This file should be imported at the top of each service's entry point

import AWSXRay from 'aws-xray-sdk-core';
import AWSXRayExpress from 'aws-xray-sdk-express';
import { Express } from 'express';

interface TracingConfig {
  serviceName: string;
  daemonAddress?: string;
  plugins?: string[];
  captureHTTPsGlobal?: boolean;
  capturePromises?: boolean;
}

export function initializeTracing(config: TracingConfig): void {
  const {
    serviceName,
    daemonAddress = process.env.XRAY_DAEMON_ADDRESS || 'xray-daemon.monitoring:2000',
    captureHTTPsGlobal = true,
    capturePromises = true,
  } = config;

  // Configure X-Ray
  AWSXRay.setDaemonAddress(daemonAddress);

  // Enable plugins
  AWSXRay.config([AWSXRay.plugins.EC2Plugin, AWSXRay.plugins.ECSPlugin]);

  // Capture all HTTP requests
  if (captureHTTPsGlobal) {
    AWSXRay.captureHTTPsGlobal(require('http'));
    AWSXRay.captureHTTPsGlobal(require('https'));
  }

  // Capture promises
  if (capturePromises) {
    AWSXRay.capturePromise();
  }

  // Set default segment name
  AWSXRay.setContextMissingStrategy('LOG_ERROR');

  console.log(`X-Ray tracing initialized for ${serviceName}`);
}

export function addTracingMiddleware(app: Express, serviceName: string): void {
  // Open segment at the beginning of each request
  app.use(AWSXRayExpress.openSegment(serviceName));
}

export function closeTracingMiddleware(app: Express): void {
  // Close segment at the end of each request
  app.use(AWSXRayExpress.closeSegment());
}

// Utility to add custom annotations to traces
export function addAnnotation(key: string, value: string | number | boolean): void {
  const segment = AWSXRay.getSegment();
  if (segment) {
    const subsegment = segment as AWSXRay.Subsegment;
    subsegment.addAnnotation(key, value);
  }
}

// Utility to add metadata to traces
export function addMetadata(key: string, value: unknown, namespace?: string): void {
  const segment = AWSXRay.getSegment();
  if (segment) {
    const subsegment = segment as AWSXRay.Subsegment;
    subsegment.addMetadata(key, value, namespace);
  }
}

// Wrap async functions for tracing
export function traceAsync<T>(
  name: string,
  fn: (subsegment: AWSXRay.Subsegment) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const segment = AWSXRay.getSegment();
    if (!segment) {
      return fn(null as unknown as AWSXRay.Subsegment).then(resolve).catch(reject);
    }

    AWSXRay.captureAsyncFunc(name, (subsegment) => {
      fn(subsegment!)
        .then((result) => {
          subsegment?.close();
          resolve(result);
        })
        .catch((err) => {
          subsegment?.addError(err);
          subsegment?.close();
          reject(err);
        });
    }, segment);
  });
}

export { AWSXRay };
