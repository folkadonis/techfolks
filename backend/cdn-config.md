# CDN Configuration for TechFolks Production

## Overview
This document outlines the CDN configuration for optimal performance and global distribution of TechFolks static assets.

## Recommended CDN Providers

### 1. Cloudflare (Recommended)
- **Global Edge Locations**: 275+ cities
- **Features**: DDoS protection, Web Application Firewall, SSL/TLS, Image optimization
- **Cost**: Free tier available, Pro at $20/month
- **Best for**: Small to medium scale deployments

### 2. AWS CloudFront
- **Global Edge Locations**: 400+ cities
- **Features**: Integration with AWS services, Lambda@Edge, Real-time metrics
- **Cost**: Pay-per-use pricing
- **Best for**: Large scale deployments, AWS ecosystem

### 3. Google Cloud CDN
- **Global Edge Locations**: 100+ cities
- **Features**: Integration with GCP services, HTTP/2, QUIC protocol support
- **Cost**: Pay-per-use pricing
- **Best for**: GCP ecosystem, advanced caching

## Asset Optimization Strategy

### Static Assets Structure
```
/assets/
  /js/
    - vendor-[hash].js (React, Router, etc.)
    - router-[hash].js (React Router)
    - query-[hash].js (TanStack Query)
    - editor-[hash].js (Monaco Editor)
    - charts-[hash].js (Chart.js)
    - ui-[hash].js (UI components)
    - app-[hash].js (Main application code)
  /css/
    - vendor-[hash].css (Third-party styles)
    - app-[hash].css (Application styles)
  /img/
    - icons/ (PWA icons, favicons)
    - screenshots/ (PWA screenshots)
    - assets/ (Application images)
  /fonts/
    - Inter/ (Main font family)
    - JetBrains-Mono/ (Code editor font)
```

### Cache Headers Configuration

#### JavaScript & CSS Files
```nginx
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";
    
    # CORS for CDN
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    add_header Access-Control-Allow-Headers "Range";
    
    # Compression
    gzip_static on;
    brotli_static on;
}
```

#### Images
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|avif)$ {
    expires 30d;
    add_header Cache-Control "public";
    add_header Vary "Accept";
    
    # Image optimization headers
    add_header X-Content-Type-Options "nosniff";
}
```

#### Fonts
```nginx
location ~* \.(woff|woff2|eot|ttf|otf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

## Cloudflare Configuration

### DNS Settings
```
Type: CNAME
Name: cdn
Value: techfolks.com
Proxy: Enabled (Orange Cloud)
TTL: Auto
```

### Page Rules
1. **Static Assets Cache Everything**
   ```
   URL: techfolks.com/assets/*
   Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 year
     - Browser Cache TTL: 1 year
   ```

2. **API Bypass Cache**
   ```
   URL: techfolks.com/api/*
   Settings:
     - Cache Level: Bypass
     - Security Level: Medium
     - SSL: Full (strict)
   ```

3. **HTML Files**
   ```
   URL: techfolks.com/*.html
   Settings:
     - Cache Level: Standard
     - Edge Cache TTL: 4 hours
     - Browser Cache TTL: 4 hours
   ```

### Optimization Settings
```yaml
Auto Minify:
  - JavaScript: On
  - CSS: On
  - HTML: On

Brotli Compression: On
HTTP/2: On
HTTP/3 (QUIC): On
0-RTT Connection Resumption: On

Image Optimization:
  - Polish: Lossless
  - WebP: On
  - AVIF: On (if available)

Mobile Redirect: Off
Rocket Loader: Off (conflicts with React)
```

### Security Settings
```yaml
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: On
Privacy Pass: On

SSL/TLS:
  - Mode: Full (strict)
  - Edge Certificates: Universal SSL
  - TLS 1.3: On
  - HSTS: On
    - Max Age: 6 months
    - Include Subdomains: On
    - Preload: On
```

## AWS CloudFront Configuration

### Distribution Settings
```yaml
Origins:
  - Domain: techfolks.com
    Origin Path: /
    Protocol: HTTPS Only
    HTTP Port: 80
    HTTPS Port: 443

Default Cache Behavior:
  - Path Pattern: Default (*)
  - Origin: techfolks.com
  - Viewer Protocol Policy: Redirect HTTP to HTTPS
  - Cache Policy: Managed-CachingOptimized
  - Origin Request Policy: Managed-CORS-S3Origin

Additional Behaviors:
  - Path Pattern: /api/*
    - Cache Policy: Managed-CachingDisabled
    - Origin Request Policy: Managed-AllViewer
  
  - Path Pattern: /assets/*
    - Cache Policy: Managed-CachingOptimized
    - TTL: Min=31536000, Default=31536000, Max=31536000
```

### Lambda@Edge Functions
```javascript
// Viewer Request - Add security headers
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    // Add security headers
    headers['strict-transport-security'] = [{
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
    }];
    
    headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    }];
    
    headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
    }];
    
    headers['referrer-policy'] = [{
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    }];

    callback(null, request);
};
```

## Performance Optimization

### Image Optimization
```yaml
Formats:
  - WebP: Modern browsers (90%+ support)
  - AVIF: Cutting edge browsers (80%+ support)
  - JPEG/PNG: Fallback

Responsive Images:
  - Breakpoints: 320px, 768px, 1024px, 1440px, 1920px
  - Quality: 80-85 for photos, 95 for graphics
  - Progressive JPEG: Enabled

Lazy Loading:
  - Intersection Observer API
  - Placeholder: Low-quality blur
  - Priority: Above-fold images loaded immediately
```

### Font Optimization
```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Inter-SemiBold.woff2" as="font" type="font/woff2" crossorigin>

<!-- Font display strategy -->
<style>
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}
</style>
```

### Resource Hints
```html
<!-- DNS prefetch for external domains -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//api.techfolks.com">

<!-- Preconnect to critical origins -->
<link rel="preconnect" href="https://api.techfolks.com">
<link rel="preconnect" href="https://cdn.techfolks.com">

<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/problems">
<link rel="prefetch" href="/contests">
```

## Monitoring and Analytics

### Performance Metrics to Track
```yaml
Core Web Vitals:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

Custom Metrics:
  - TTI (Time to Interactive): < 3.5s
  - Speed Index: < 3.0s
  - Total Blocking Time: < 200ms

CDN Metrics:
  - Cache Hit Ratio: > 95%
  - Origin Shield Hit Ratio: > 90%
  - Edge Response Time: < 50ms
```

### Real User Monitoring (RUM)
```javascript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Cost Estimation

### Cloudflare Pro Plan
```yaml
Monthly Costs:
  - Pro Plan: $20/month
  - Bandwidth: Free (unlimited)
  - Requests: Free (unlimited)
  - Image Optimization: $10/month (optional)
  
Total: ~$30/month
```

### AWS CloudFront
```yaml
Monthly Costs (10K users, 100GB transfer):
  - Data Transfer: $8.50
  - HTTP/HTTPS Requests: $1.00
  - Lambda@Edge: $2.00
  
Total: ~$11.50/month
```

## Implementation Checklist

- [ ] Choose CDN provider (Cloudflare recommended for start)
- [ ] Configure DNS CNAME records
- [ ] Set up cache rules and TTLs
- [ ] Enable compression (Gzip + Brotli)
- [ ] Configure security headers
- [ ] Implement image optimization
- [ ] Set up font loading strategy
- [ ] Add resource hints to HTML
- [ ] Configure monitoring and alerts
- [ ] Test cache hit ratios and performance
- [ ] Set up automatic cache purging for deployments

## Deployment Integration

### Automatic Cache Purging
```yaml
# GitHub Actions example
- name: Purge CDN Cache
  run: |
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

This CDN configuration will ensure optimal performance for global users while maintaining cost efficiency and reliability.