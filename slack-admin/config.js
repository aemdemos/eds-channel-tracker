/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { API_CONFIG } from './constants.js';

// Check if we should force production endpoint (useful for development)
const forceProduction = localStorage.getItem('forceProductionAPI') === 'true';

const API_ENDPOINT = (window.location.href.includes('localhost') && !forceProduction)
  ? API_CONFIG.ENDPOINTS.LOCAL
  : API_CONFIG.ENDPOINTS.PRODUCTION;

// Log the current endpoint for debugging
console.log('API Endpoint:', API_ENDPOINT);
console.log('Force Production:', forceProduction);

export default API_ENDPOINT;
