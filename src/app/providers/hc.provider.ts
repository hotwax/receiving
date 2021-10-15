import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HcProvider {
  public baseUrl: string;
  constructor(private http: HttpClient) {
    if (environment.BASE_URL && environment.BASE_URL.trim() !== '') {
      this.baseUrl = environment.BASE_URL;
    }
  }

  callRequest(type, endPoint, params?) {
    if (type == 'get') {
      if (params) return this.http.request(type, this.baseUrl + endPoint, { params: params });
      return this.http.request(type, this.baseUrl + endPoint);
    }
    else if (type == 'post') {
      if (params) return this.http.request(type, this.baseUrl + endPoint, { body: params, observe: 'response' });
      return this.http.request(type, this.baseUrl + endPoint, {});
    }
    else if (type == 'put') {
      return this.http.request(type, this.baseUrl + endPoint, { params: params });
    }
  }
}