import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, throwError } from "rxjs";
import { catchError } from 'rxjs/operators';
import { AppKeycloakService } from "./appKeycloakService";

@Injectable({
    providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {
    constructor(private appKeycloakService: AppKeycloakService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        // Skip auth for Keycloak endpoints
        if (req.url.includes('/auth/') || req.url.includes('/realms/')) {
            return next.handle(req);
        }

        // Skip auth for public API endpoints
        if (req.url.includes('/api/public/') || req.url.includes('/public/')) {
            return next.handle(req);
        }

        // Skip auth for face authentication endpoints (login/register)
        // if (req.url.includes('/api/face/authenticate') || req.url.includes('/api/face/register')) {
        //     return next.handle(req);
        // }

        // Check for face authentication token first
        // const faceAuthToken = localStorage.getItem('access_token');
        // if (faceAuthToken) {
        //     const tokenType = localStorage.getItem('token_type') || 'Bearer';
        //     const authReq = req.clone({
        //         setHeaders: {
        //             Authorization: `${tokenType} ${faceAuthToken}`
        //         }
        //     });
        //     return next.handle(authReq);
        // }

        // Skip auth if not initialized yet (prevents errors during startup)
        if (!this.appKeycloakService.isInitialized) {
            return next.handle(req).pipe(
                catchError((error: HttpErrorResponse) => {
                    // Silently ignore 401 errors during initialization
                    if (error.status === 401) {
                        return throwError(() => null);
                    }
                    return throwError(() => error);
                })
            );
        }

        const isLoggedIn = this.appKeycloakService.isLoggedIn();

        if (!isLoggedIn) {
            return next.handle(req);
        }

        const token = this.appKeycloakService.profile?.token;

        if (!token) {
            return next.handle(req);
        }

        const authreq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next.handle(authreq);
    }

}