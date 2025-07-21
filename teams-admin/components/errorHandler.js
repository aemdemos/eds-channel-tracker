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

export class ErrorHandler {
  static logError(error, context = '') {
    console.error(`[${context}] Error:`, error);
  }

  static displayUserError(message, container = null) {
    if (container) {
      container.innerHTML = `<p class="error">${message}</p>`;
    } else {
      alert(message);
    }
  }

  static handleApiError(error, context = 'API') {
    this.logError(error, context);
    
    if (error.name === 'NetworkError' || !navigator.onLine) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (error.status === 401) {
      return 'Authentication failed. Please refresh the page and try again.';
    }
    
    if (error.status === 403) {
      return 'Access denied. You may not have permission for this action.';
    }
    
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  static async withErrorHandling(asyncFn, context = '') {
    try {
      return await asyncFn();
    } catch (error) {
      this.logError(error, context);
      throw error;
    }
  }

  static showRetryableError(message, retryFn, container = null) {
    const errorHtml = `
      <div class="error-container">
        <p class="error">${message}</p>
        <button class="retry-button" onclick="this.closest('.error-container').remove(); ${retryFn}">
          Retry
        </button>
      </div>
    `;
    
    if (container) {
      container.innerHTML = errorHtml;
    }
  }

  static validateRequired(fields) {
    const errors = [];
    
    for (const [name, value] of Object.entries(fields)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${name} is required`);
      }
    }
    
    return errors;
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static createErrorBoundary(componentFn, fallbackContent = 'Something went wrong') {
    return async (...args) => {
      try {
        return await componentFn(...args);
      } catch (error) {
        this.logError(error, 'Component Error');
        return fallbackContent;
      }
    };
  }
} 