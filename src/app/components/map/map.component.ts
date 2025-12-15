// src/app/map/map.component.ts  →  FINAL VERSION THAT WORKS 100%
import { Component, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PickUpPointService } from '../../services/pickup-point.service';
import { RouteService } from '../../services/route.service';
import { Route } from '../../models/Route';
import { RouteStatus } from '../../models/enums/RouteStatus';
import * as L from 'leaflet';
import { AppResponse } from '../../models/AppResponse';
import { ToastService } from '../../services/toast.service';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/dist/images/marker-icon-2x.png',
  iconUrl: 'leaflet/dist/images/marker-icon.png',
  shadowUrl: 'leaflet/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private routeLayer: L.Polyline | null = null;
  optimizedRouteData: Route | null = null;
  isDuplicateRoute: boolean = false;
  duplicateCheckLoading: boolean = false;

  private readonly depot = { lat: 35.77799, lng: 10.82617, name: 'Central Depot - Monastir' };
  private fullPoints: { lat: number; lng: number; point: any }[] = [];

  private greenBin = L.icon({ iconUrl: 'assets/icons/green.png', iconSize: [40, 50], iconAnchor: [20, 50], popupAnchor: [0, -50] });
  private redBin = L.icon({ iconUrl: 'assets/icons/redbin.png', iconSize: [40, 50], iconAnchor: [20, 50], popupAnchor: [0, -50] });
  private homeIcon = L.icon({ iconUrl: 'assets/icons/home.png', iconSize: [50, 50], iconAnchor: [25, 50], popupAnchor: [0, -50] });

  private readonly GRAPHHOPPER_KEY = '0f520a1f-6282-4995-bb8f-d285c7cb0f11';

  constructor(
    private http: HttpClient,
    private pickUpPointService: PickUpPointService,
    private routeService: RouteService,
    private toastService: ToastService
  ) { }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadPickupPoints();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [this.depot.lat, this.depot.lng],
      zoom: 13,
      zoomControl: false // On va le repositionner
    });

    // Style de carte moderne et sombre
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);

    // Add zoom control in custom position
    L.control.zoom({
      position: 'topright'
    }).addTo(this.map);

    // Scale control
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false
    }).addTo(this.map);

    // Enhanced legend with modern style
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
      div.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid rgba(102, 126, 234, 0.2);
      `;
      div.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #2c3e50; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
          🗺️ Legend
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 6px;">
          <img src="assets/icons/home.png" width="24" style="margin-right: 10px;">
          <span style="font-size: 13px; color: #2c3e50; font-weight: 500;">Central Depot</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 6px;">
          <img src="assets/icons/green.png" width="24" style="margin-right: 10px;">
          <span style="font-size: 13px; color: #27ae60; font-weight: 500;">Conteneur OK</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0; padding: 6px; background: #f8f9fa; border-radius: 6px;">
          <img src="assets/icons/redbin.png" width="24" style="margin-right: 10px;">
          <span style="font-size: 13px; color: #e74c3c; font-weight: 500;">Urgent / HS</span>
        </div>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e9ecef;">
          <div style="display: flex; align-items: center; margin: 6px 0;">
            <div style="width: 30px; height: 4px; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px; margin-right: 10px;"></div>
            <span style="font-size: 12px; color: #7f8c8d;">Optimized route</span>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(this.map);

    // Custom fullscreen button
    const fullscreenBtn = new L.Control({ position: 'topright' });
    fullscreenBtn.onAdd = () => {
      const btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      btn.innerHTML = `
        <a href="#" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 4px;
          text-decoration: none;
          font-size: 18px;
          transition: all 0.2s;
        " title="Fullscreen">
          🔲
        </a>
      `;
      btn.onclick = (e) => {
        e.preventDefault();
        const container = document.getElementById('map');
        if (container) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            container.requestFullscreen();
          }
        }
      };
      return btn;
    };
    fullscreenBtn.addTo(this.map);
  }

  private loadPickupPoints(): void {
    this.pickUpPointService.getAll().subscribe({
      next: (res: AppResponse) => {
        this.clearMap();
        this.fullPoints = [];
        this.addDepotMarker();
        this.plotPoints(res.pickuppoints || []);

        if (this.fullPoints.length > 0) {
          this.drawBestRouteFromHome();
        } else {
          this.map.setView([this.depot.lat, this.depot.lng], 13);
        }
      },
      error: () => L.popup().setLatLng([this.depot.lat, this.depot.lng]).setContent('Serveur indisponible').openOn(this.map),
    });
  }

  private clearMap(): void {
    this.map.eachLayer(l => { if (l instanceof L.Marker || l instanceof L.Polyline) this.map.removeLayer(l); });
    if (this.routeLayer) { this.map.removeLayer(this.routeLayer); this.routeLayer = null; }
    this.optimizedRouteData = null;
  }

  private addDepotMarker(): void {
    L.marker([this.depot.lat, this.depot.lng], { icon: this.homeIcon })
      .addTo(this.map)
      .bindPopup('<b style="color:#27ae60">Central Depot</b><br>Starting point')
      .bindTooltip('START', { permanent: true, direction: 'top' });
  }

  private plotPoints(points: any[]): void {
    points.forEach(p => {
      const lat = p.locationLatitude;
      const lng = p.locationLongitude;
      const isFull = (p.containers || []).some((c: any) => c.fillLevel / c.capacity >= 0.8);
      const isBroken = (p.containers || []).some((c: any) => c.containerStatus === 'non_functional');
      const isRed = isFull || isBroken;

      if (isRed) this.fullPoints.push({ lat, lng, point: p });

      const icon = isRed ? this.redBin : this.greenBin;
      L.marker([lat, lng], { icon })
        .addTo(this.map)
        .bindPopup(this.createPopup(p, isRed))
        .bindTooltip(isRed ? 'Pleine!' : 'OK', { direction: 'top' });
    });
  }

  private createPopup(p: any, isRed: boolean): string {
    const containers = p.containers || [];

    const containerItems = containers.map((c: any) => {
      const pct = Math.round((c.fillLevel / c.capacity) * 100);
      const isBroken = c.containerStatus === 'non_functional';

      let color = '#27ae60';
      let icon = '✓';
      let statusText = 'Normal';

      if (isBroken) {
        color = '#95a5a6';
        icon = '⚠';
        statusText = 'Hors service';
      } else if (pct >= 80) {
        color = '#e74c3c';
        icon = '!';
        statusText = 'Urgent';
      } else if (pct >= 60) {
        color = '#f39c12';
        icon = '!';
        statusText = 'Attention';
      }

      return `
        <div style="
          background:white;
          border:2px solid ${color};
          border-radius:10px;
          padding:14px;
          margin:10px 0;
          box-shadow:0 2px 6px rgba(0,0,0,0.08);
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div>
              <div style="font-weight:700;font-size:15px;color:#2c3e50;margin-bottom:3px;">${c.containerType}</div>
              <div style="font-size:11px;color:#7f8c8d;">ID: ${c.containerId || 'N/A'}</div>
            </div>
            <div style="
              background:${color};
              color:white;
              padding:6px 12px;
              border-radius:20px;
              font-size:12px;
              font-weight:700;
              white-space:nowrap;
            ">
              ${icon} ${statusText}
            </div>
          </div>

          ${!isBroken ? `
            <div style="margin:12px 0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;color:#7f8c8d;font-weight:500;">Remplissage</span>
                <span style="font-weight:700;color:${color};font-size:16px;">${pct}%</span>
              </div>
              <div style="
                background:#e9ecef;
                border-radius:12px;
                height:14px;
                overflow:hidden;
                box-shadow:inset 0 1px 3px rgba(0,0,0,0.1);
              ">
                <div style="
                  background:linear-gradient(90deg, ${color}, ${color}dd);
                  height:100%;
                  width:${pct}%;
                  border-radius:12px;
                  transition:width 0.5s ease;
                "></div>
              </div>
              <div style="
                display:flex;
                justify-content:space-between;
                font-size:12px;
                color:#95a5a6;
                margin-top:6px;
                font-weight:500;
              ">
                <span>0%</span>
                <span>${c.fillLevel} / ${c.capacity} L</span>
                <span>100%</span>
              </div>
            </div>
          ` : `
            <div style="
              background:#f8f9fa;
              border-radius:8px;
              padding:12px;
              text-align:center;
              margin-top:8px;
            ">
              <div style="font-size:24px;margin-bottom:6px;">⚠️</div>
              <div style="color:#95a5a6;font-size:13px;font-weight:600;">Conteneur non fonctionnel</div>
              <div style="color:#bdc3c7;font-size:11px;margin-top:4px;">Requires intervention</div>
            </div>
          `}
        </div>
      `;
    }).join('');

    const statusBadge = isRed
      ? `<div style="
          background:linear-gradient(135deg,#e74c3c,#c0392b);
          color:white;
          padding:12px 16px;
          border-radius:10px;
          text-align:center;
          font-weight:700;
          margin-top:12px;
          box-shadow:0 3px 10px rgba(231,76,60,0.3);
          font-size:13px;
        ">
          🚨 ACTION REQUIRED - Urgent emptying
        </div>`
      : `<div style="
          background:linear-gradient(135deg,#27ae60,#229954);
          color:white;
          padding:12px 16px;
          border-radius:10px;
          text-align:center;
          font-weight:700;
          margin-top:12px;
          box-shadow:0 3px 10px rgba(39,174,96,0.3);
          font-size:13px;
        ">
          ✓ Normal Status - OK
        </div>`;

    return `
      <div style="
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        width:100%;
        max-width:380px;
      ">
        <div style="
          background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color:white;
          padding:16px;
          margin:-12px -12px 12px -12px;
          border-radius:10px 10px 0 0;
          box-shadow:0 4px 10px rgba(102,126,234,0.3);
        ">
          <div style="font-size:18px;font-weight:700;margin-bottom:4px;">📍 Point de Collecte</div>
          <div style="font-size:14px;opacity:0.95;font-weight:500;">${p.locationName || 'Sans nom'}</div>
          <div style="font-size:11px;opacity:0.8;margin-top:6px;">
            ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        ${containers.length > 0 ? containerItems : `
          <div style="
            text-align:center;
            padding:30px 20px;
            color:#95a5a6;
            background:#f8f9fa;
            border-radius:10px;
            margin:10px 0;
          ">
            <div style="font-size:48px;margin-bottom:10px;opacity:0.5;">📦</div>
            <div style="font-size:14px;font-weight:600;">Aucun conteneur disponible</div>
            <div style="font-size:12px;margin-top:6px;">This pickup point has no registered containers</div>
          </div>
        `}

        ${statusBadge}
      </div>
    `;
  }

  private async drawBestRouteFromHome(): Promise<void> {
    if (this.routeLayer) { this.map.removeLayer(this.routeLayer); this.routeLayer = null; }
    this.optimizedRouteData = null;

    const points = [[this.depot.lng, this.depot.lat], ...this.fullPoints.map(p => [p.lng, p.lat] as [number, number])];

    try {
      const response = await fetch(`https://graphhopper.com/api/1/route?key=${this.GRAPHHOPPER_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, vehicle: 'car', optimize: true }),
      });

      const data = await response.json();

      if (data.paths?.[0]) {
        const path = data.paths[0];
        const latlngs = this.decodePolyline(path.points);

        // Main route with animated effect
        this.routeLayer = L.polyline(latlngs, {
          color: '#667eea',
          weight: 8,
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(this.map);

        // Bordure externe pour effet 3D
        L.polyline(latlngs, {
          color: '#4a5fd8',
          weight: 12,
          opacity: 0.3,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(this.map);

        // Animated highlight line
        const animatedLine = L.polyline(latlngs, {
          color: '#ffffff',
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 20',
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(this.map);

        // Animation de la ligne
        let offset = 0;
        setInterval(() => {
          offset = (offset + 1) % 30;
          (animatedLine as any).setStyle({ dashOffset: -offset });
        }, 50);

        const km = (path.distance / 1000).toFixed(1);
        const min = Math.round(path.time / 60000);

        // Add step numbers on each point
        this.fullPoints.forEach((p, index) => {
          const stepMarker = L.divIcon({
            className: 'step-marker',
            html: `
              <div style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-family: system-ui;
              ">
                ${index + 1}
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          L.marker([p.lat, p.lng], { icon: stepMarker })
            .addTo(this.map)
            .bindTooltip(`Step ${index + 1}`, { direction: 'top', permanent: false });
        });

        // Enhanced popup for the route
        L.marker([this.depot.lat, this.depot.lng], { icon: this.homeIcon })
          .addTo(this.map)
          .bindPopup(`
            <div style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-width: 280px;
              padding: 8px;
            ">
              <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                margin: -8px -8px 16px -8px;
                border-radius: 10px 10px 0 0;
                text-align: center;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
              ">
                <div style="font-size: 24px; margin-bottom: 8px;">🚛</div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">
                  OPTIMAL ROUTE
                </div>
                <div style="font-size: 13px; opacity: 0.9;">
                  Optimized collection route
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="
                  text-align: center;
                  background: #f8f9fa;
                  padding: 12px 8px;
                  border-radius: 10px;
                  border: 2px solid #e9ecef;
                ">
                  <div style="font-size: 24px; margin-bottom: 4px;">📍</div>
                  <div style="font-weight: 700; font-size: 18px; color: #667eea;">
                    ${this.fullPoints.length}
                  </div>
                  <div style="font-size: 11px; color: #7f8c8d; margin-top: 4px;">
                    Points
                  </div>
                </div>

                <div style="
                  text-align: center;
                  background: #f8f9fa;
                  padding: 12px 8px;
                  border-radius: 10px;
                  border: 2px solid #e9ecef;
                ">
                  <div style="font-size: 24px; margin-bottom: 4px;">🛣️</div>
                  <div style="font-weight: 700; font-size: 18px; color: #667eea;">
                    ${km}
                  </div>
                  <div style="font-size: 11px; color: #7f8c8d; margin-top: 4px;">
                    Kilometers
                  </div>
                </div>

                <div style="
                  text-align: center;
                  background: #f8f9fa;
                  padding: 12px 8px;
                  border-radius: 10px;
                  border: 2px solid #e9ecef;
                ">
                  <div style="font-size: 24px; margin-bottom: 4px;">⏱️</div>
                  <div style="font-weight: 700; font-size: 18px; color: #667eea;">
                    ${min}
                  </div>
                  <div style="font-size: 11px; color: #7f8c8d; margin-top: 4px;">
                    Minutes
                  </div>
                </div>
              </div>

              <div style="
                background: linear-gradient(135deg, #27ae60, #229954);
                color: white;
                padding: 12px;
                border-radius: 10px;
                text-align: center;
                font-weight: 600;
                font-size: 13px;
                box-shadow: 0 3px 10px rgba(39, 174, 96, 0.3);
              ">
                ✓ Route optimized and ready to start
              </div>
            </div>
          `)
          .openPopup();

        this.map.fitBounds(this.routeLayer.getBounds().pad(0.4));

        const pickupIds = this.fullPoints.map(p => {
          console.log('Processing pickup point:', p.point);
          const id = p.point._id || p.point.id;
          console.log('Extracted ID:', id);
          return id;
        });

        this.optimizedRouteData = {
          routeDate: new Date().toISOString(),
          totalDistance: path.distance,
          totalTime: path.time,
          encodedPolyline: path.points,
          pickUpPointIds: pickupIds,
          status: RouteStatus.planned,
          instructions: path.instructions.map((i: any) => ({
            distance: i.distance,
            sign: i.sign,
            text: i.text,
            time: i.time,
            streetName: i.street_name
          }))
        };

        this.duplicateCheckLoading = true;
        this.routeService.checkDuplicate(pickupIds).subscribe({
          next: (response) => {
            if (response.status === 409) {
              this.isDuplicateRoute = true;
              this.duplicateCheckLoading = false;
              this.toastService.showInfo('A route with these pickup points already exists!', 'Route Exists');
            } else {
              this.isDuplicateRoute = false;
              this.duplicateCheckLoading = false;
            }
          },
          error: (err) => {
            if (err.status === 409) {
              this.isDuplicateRoute = true;
              this.toastService.showInfo('A route with these pickup points already exists!', 'Route Exists');
            } else {
              console.error('Error checking duplicate:', err);
            }
            this.duplicateCheckLoading = false;
          }
        });

        console.log('=== ROUTE OPTIMIZATION COMPLETE ===');
        console.log('Total pickup points:', this.optimizedRouteData.pickUpPointIds?.length);
        console.log('Pickup Point IDs being sent:', this.optimizedRouteData.pickUpPointIds);
        console.log('Full points array:', this.fullPoints);
        console.log('Ready to save. Click "Create Route" button.');
      }
    } catch (err) {
      console.error(err);
      alert('Temporary network error');
    }
  }

  private decodePolyline(encoded: string): L.LatLng[] {
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    const array: L.LatLng[] = [];

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      array.push(L.latLng(lat * 1e-5, lng * 1e-5));
    }
    return array;
  }

  public saveOptimizedRoute(): void {
    if (!this.optimizedRouteData) {
      this.toastService.showError('No optimized route found  to save');
      return;
    }

    console.log('=== SAVING ROUTE TO BACKEND ===');
    console.log('Route data:', JSON.stringify(this.optimizedRouteData, null, 2));
    console.log('Pickup Point IDs count:', this.optimizedRouteData.pickUpPointIds?.length);
    console.log('Pickup Point IDs:', this.optimizedRouteData.pickUpPointIds);

    this.routeService.create(this.optimizedRouteData).subscribe({
      next: (res) => {
        console.log('=== ROUTE SAVED SUCCESSFULLY ===');
        console.log('Backend response:', res);
        console.log('Pickup points sent:', this.optimizedRouteData?.pickUpPointIds?.length);
        console.log('Pickup points in response:', res.route?.pickUpPoints?.length);
        console.log('Response route:', res.route);
        this.optimizedRouteData = null;
        this.toastService.showSuccess(`${res.message}`, 'Route Saved');
      },
      error: (err) => {
        console.error('=== ERROR SAVING ROUTE ===');
        console.error('Error:', err);
        console.error('Error response:', err.error);
        this.toastService.showError(`${err.error.message}`, 'Error saving route');
      }
    });
  }

  public hasOptimizedRoute(): boolean {
    return this.optimizedRouteData !== null;
  }
}