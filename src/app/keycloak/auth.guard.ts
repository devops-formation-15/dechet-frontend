import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, RouterStateSnapshot, Router } from "@angular/router";
import { AppKeycloakService } from "./appKeycloakService";
import { ToastService } from "../../app/services/toast.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private appKeycloakService: AppKeycloakService,
        private router: Router,
        private toastService: ToastService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

        // // Check for face authentication token first (before Keycloak checks)
        // const faceAuthToken = localStorage.getItem('access_token');
        // const faceAuthUser = localStorage.getItem('faceAuthUser');

        // if (faceAuthToken && faceAuthUser && faceAuthToken.startsWith('FACE_AUTH_TOKEN_')) {
        //     // User is authenticated via face recognition
        //     console.log('Auth Guard: User authenticated via face recognition:', faceAuthUser);

        //     // For face-authenticated users, skip role checks if no specific roles required
        //     const routeRoles: string[] = route.data['roles'] || [];
        //     if (routeRoles.length === 0) {
        //         return true;
        //     }

        //     // Face-authenticated users are treated as USER role
        //     const hasAccess = routeRoles.some(role => role.toLowerCase() === 'user');
        //     if (!hasAccess) {
        //         this.toastService.showAccesDenied('Access Denied', 'You do not have permission to access this page');
        //         this.router.navigate(['/']);
        //         return false;
        //     }

        //     return true;
        // }

        // Wait for Keycloak to initialize
        if (!this.appKeycloakService.isInitialized) {
            console.log('Auth Guard: Keycloak not initialized yet');
            return false;
        }

        if (!this.appKeycloakService.isLoggedIn()) {
            console.log('Auth Guard: User not logged in, redirecting to Keycloak');
            this.appKeycloakService.login();
            return false;
        }


        if (!this.appKeycloakService.profile) {
            console.log('Auth Guard: No Keycloak profile found, redirecting to login');
            this.appKeycloakService.login();
            return false;
        }

        const routeRoles: string[] = route.data['roles'] || [];
        const userRoles: string = this.appKeycloakService?.profile?.role || "";


        if (routeRoles.length === 0) {
            return true;
        }


        const hasAccess = routeRoles.some(
            role => userRoles.toLowerCase() === role.toLowerCase()
        );
        if (hasAccess) {
            return true;
        } else {
            // Security protection: This should rarely trigger if UI is properly hidden
            this.toastService.showAccesDenied(
                "This page requires admin privileges",
                "Access Denied"
            );
            this.router.navigate(['/']);
            return false;
        }
    }

}