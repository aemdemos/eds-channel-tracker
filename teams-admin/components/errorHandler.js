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

class ErrorHandler {
  static logError(error, context = '') {
    // eslint-disable-next-line no-console
    console.error(`[${context}] Error:`, error);
  }

  static displayUserError(message, container = null) {
    if (container) {
      container.innerHTML = `<p class="error">${message}</p>`;
    } else {
      // eslint-disable-next-line no-console
      console.error('User Error:', message);
      // Fallback to console when no container is available
    }
  }

  static async withErrorHandling(asyncFn, context = '') {
    try {
      return await asyncFn();
    } catch (error) {
      this.logError(error, context);
      throw error;
    }
  }
}

export default ErrorHandler;
