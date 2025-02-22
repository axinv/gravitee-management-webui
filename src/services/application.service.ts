/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as _ from 'lodash';
import { PagedResult } from "../entities/pagedResult";

export class LogsQuery {
  from: number;
  to: number;
  query?: string;
  page: number;
  size: number;
  field: string;
}

interface IMember {
  username: string;
  type: string;
  role: string;
}

interface IMembership {
  id?: string;
  reference?: string;
  role: string;
}

class ApplicationService {
  private applicationsURL: string;
  private analyticsHttpTimeout: number;

  constructor(private $http: ng.IHttpService, Constants) {
    'ngInject';
    this.applicationsURL = `${Constants.baseURL}applications/`;
    this.analyticsHttpTimeout = Constants.analyticsHttpTimeout as number
  }

  private subscriptionsURL(applicationId: string): string {
    return `${this.applicationsURL}${applicationId}/subscriptions/`;
  }

	get(applicationId: string): ng.IHttpPromise<any> {
    return this.$http.get(this.applicationsURL + applicationId);
  }

	getMembers(applicationId): ng.IHttpPromise<any> {
		return this.$http.get(this.applicationsURL + applicationId + '/members');
	}

	addOrUpdateMember(applicationId: string, membership: IMembership): ng.IHttpPromise<any> {
    return this.$http.post(`${this.applicationsURL}${applicationId}/members`, membership);
	}

	deleteMember(applicationId:string, userId: string): ng.IHttpPromise<any> {
		return this.$http.delete(this.applicationsURL + applicationId + '/members?user=' + userId);
	}

  transferOwnership(applicationId: string, ownership: IMembership): ng.IHttpPromise<any> {
    return this.$http.post(this.applicationsURL + applicationId + '/members/transfer_ownership', ownership);
  }

  list(): ng.IHttpPromise<any> {
    return this.$http.get(this.applicationsURL);
  }

  listByGroup(group) {
    return this.$http.get(this.applicationsURL + "?group=" + group);
  }

	create(application): ng.IHttpPromise<any> {
    return this.$http.post(this.applicationsURL, application);
  }

  update(application): ng.IHttpPromise<any> {
    return this.$http.put(
      this.applicationsURL + application.id,
      {
        'name': application.name,
        'description': application.description,
        'groups': application.groups,
        'settings': application.settings
      }
    );
  }

  delete(applicationId: string): ng.IHttpPromise<any> {
    return this.$http.delete(this.applicationsURL + applicationId);
  }

  search(query) {
    return this.$http.get(this.applicationsURL + "?query=" + query);
  }

  /*
   * Subscriptions
   */
  subscribe(applicationId: string, planId: string, request?: string): ng.IHttpPromise<any> {
    let data;
    if (request) {
      data = {request: request}
    } else {
      data = '';
    }
    return this.$http.post(this.subscriptionsURL(applicationId) + '?plan=' + planId, data);
  }

  listSubscriptions(applicationId: string, query?: string): ng.IHttpPromise<PagedResult> {
    let req = this.subscriptionsURL(applicationId);
    if (query !== undefined) {
      req += query;
    }

    return this.$http.get(req);
  }

  getSubscribedAPI(applicationId: string): ng.IHttpPromise<any> {
    return this.$http.get(this.applicationsURL + applicationId + '/subscribed');
  }

  getSubscription(applicationId, subscriptionId) {
    return this.$http.get(this.subscriptionsURL(applicationId) + subscriptionId);
  }

  closeSubscription(applicationId, subscriptionId) {
    return this.$http.delete(this.subscriptionsURL(applicationId) + subscriptionId);
  }

  listApiKeys(applicationId, subscriptionId): ng.IHttpPromise<any> {
    return this.$http.get(this.subscriptionsURL(applicationId) + subscriptionId + '/keys');
  }

  renewApiKey(applicationId, subscriptionId) {
    return this.$http.post(this.subscriptionsURL(applicationId) + subscriptionId, '');
  }

  revokeApiKey(applicationId, subscriptionId, apiKey) {
    return this.$http.delete(this.subscriptionsURL(applicationId) + subscriptionId + '/keys/' + apiKey);
  }

  /*
   * Analytics
   */
  analytics(application, request) {
    var url = this.applicationsURL + application + '/analytics?';

    var keys = Object.keys(request);
    _.forEach(keys, function (key) {
      var val = request[key];
      if (val !== undefined && val !== '') {
        url += key + '=' + val + '&';
      }
    });

    return this.$http.get(url, {timeout: this.analyticsHttpTimeout});
  }

  /*
   * Logs
   */
  private buildURLWithQuery(query: LogsQuery, url) {
    var keys = Object.keys(query);
    _.forEach(keys, function (key) {
      var val = query[key];
      if (val !== undefined && val !== '') {
        url += key + '=' + val + '&';
      }
    });
    return url;
  }

  private cloneQuery(query: LogsQuery) {
    let clonedQuery = _.clone(query);
    if (_.startsWith(clonedQuery.field, '-')) {
      clonedQuery.order = false;
      clonedQuery.field = clonedQuery.field.substring(1);
    } else {
      clonedQuery.order = true;
    }
    return clonedQuery;
  }

  findLogs(application: string, query: LogsQuery): ng.IPromise<any> {
    return this.$http.get(this.buildURLWithQuery(this.cloneQuery(query), this.applicationsURL + application + '/logs?'), {timeout: 30000});
  }

  exportLogsAsCSV(application: string, query: LogsQuery): ng.IPromise<any> {
    return this.$http.get(this.buildURLWithQuery(this.cloneQuery(query), this.applicationsURL + application + '/logs/export?'), {timeout: 30000});
  }

  getLog(api, logId, timestamp) {
    return this.$http.get(this.applicationsURL + api + '/logs/' + logId + ((timestamp) ? '?timestamp=' + timestamp : ''));
  }

  getPermissions(application) {
    return this.$http.get(this.applicationsURL + application + '/members/permissions');
  }

  getType(application: any): string {
    let applicationType = 'Simple';
    if (application.settings) {
      if (application.settings.app && application.settings.app.type) {
        applicationType = application.settings.app.type;
      } else if (application.settings.oauth) {
        switch (application.settings.oauth.application_type) {
          case "backend_to_backend":
            applicationType = 'OAuth2 backend to backend';
            break;
          case "browser":
            applicationType = 'OAuth2 browser';
            break;
          case "native":
            applicationType = 'OAuth2 native';
            break;
          case "web":
            applicationType = 'OAuth2 web';
            break;
        }
      }
    }
    return applicationType;
  }
}

export default ApplicationService;
