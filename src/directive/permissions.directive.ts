import {
    Directive, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef,
    ViewContainerRef
} from "@angular/core";
import { NgxPermissionsService } from "../service/permissions.service";
import { Subscription } from "rxjs/Subscription";
import { NgxRolesService } from '../service/roles.service';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/combineLatest';
import { Observable } from 'rxjs/Observable';

@Directive({
    selector: '[ngxPermissionsOnly],[ngxPermissionsExcept]'
})
export class NgxPermissionsDirective implements OnInit, OnDestroy {

    @Input() ngxPermissionsOnly: any;

    @Input() ngxPermissionsExcept: any;

    @Output() permissionsAuthorized = new EventEmitter();
    @Output() permissionsUnauthorized = new EventEmitter();

    @Input() ngxPermissionsOnlyThen: any;
    @Input() ngxPermissionsOnlyElse: any;

    @Input() ngxPermissionsExceptElse: any;
    @Input() ngxPermissionsExceptThen: any;

    @Input() ngxPermissionsThen: any;
    @Input() ngxPermissionsElse: any;

    private initPermissionSubscription: Subscription;

    private firstRun = false;

    constructor(private permissionsService: NgxPermissionsService,
                private rolesService: NgxRolesService,
                private viewContainer: ViewContainerRef,
                private templateRef: TemplateRef<EvryIfPermissionContext>) {}

    ngOnInit(): void {
        this.initPermissionSubscription = Observable.merge(this.permissionsService.permissions$, this.rolesService.roles$).subscribe((permissions) => {
            //it will run always 2 times so we can ignore the first time;
            if (!this.firstRun) {
                this.firstRun = true;
                return;
            }

            if (!!this.ngxPermissionsExcept) {
                 Promise.all([this.permissionsService.hasPermission(this.ngxPermissionsExcept), this.rolesService.hasOnlyRoles(this.ngxPermissionsExcept)])
                    .then(([permissionsPr, roles]) => {
                        if (permissionsPr || roles) {
                            this.permissionsUnauthorized.emit();
                            this.viewContainer.clear();
                            if (!!this.ngxPermissionsExceptElse || this.ngxPermissionsElse) {
                                this.viewContainer.createEmbeddedView(this.ngxPermissionsExceptElse || this.ngxPermissionsElse);
                            }
                        } else {
                            if (!!this.ngxPermissionsOnly) {
                                throw false;
                            } else {
                                this.permissionsAuthorized.emit();
                                this.viewContainer.clear();

                                if (!!this.ngxPermissionsExceptThen || this.ngxPermissionsThen) {
                                    this.viewContainer.createEmbeddedView(this.ngxPermissionsExceptThen || this.ngxPermissionsThen);
                                    return;

                                }
                                this.viewContainer.createEmbeddedView(this.templateRef);
                            }


                        }
                    }).catch(() => {
                        if (!!this.ngxPermissionsOnly) {
                            this.checkIfPermissionsOnly();
                            return;
                        }

                        this.viewContainer.clear();
                         if (!!this.ngxPermissionsExceptElse || this.ngxPermissionsElse) {
                             this.viewContainer.createEmbeddedView(this.ngxPermissionsExceptElse || this.ngxPermissionsElse);
                             return;
                         }
                        this.viewContainer.createEmbeddedView(this.templateRef);
                });
                return;
            }


            if (!!this.ngxPermissionsOnly) {
                this.checkIfPermissionsOnly();
            }
        });
    }

    ngOnDestroy(): void {
        if (!!this.initPermissionSubscription) {
            this.initPermissionSubscription.unsubscribe();
        }
    }

    private checkIfPermissionsOnly() {
        return Promise.all([this.permissionsService.hasPermission(this.ngxPermissionsOnly), this.rolesService.hasOnlyRoles(this.ngxPermissionsOnly)])
            .then(([permissionPr,  roles]) => {
                if (permissionPr || roles) {
                    this.permissionsAuthorized.emit();
                    this.viewContainer.clear();

                    if (this.ngxPermissionsOnlyThen || this.ngxPermissionsThen) {
                        this.viewContainer.createEmbeddedView(this.ngxPermissionsOnlyThen || this.ngxPermissionsThen);
                        return;
                    }
                    this.viewContainer.createEmbeddedView(this.templateRef);


                } else {
                    this.permissionsUnauthorized.emit();
                    this.viewContainer.clear();
                    if (!!this.ngxPermissionsOnlyElse || this.ngxPermissionsElse) {
                        this.viewContainer.createEmbeddedView(this.ngxPermissionsOnlyElse || this.ngxPermissionsElse);
                    }
                }
            }).catch(() => {
                this.permissionsUnauthorized.emit();
                this.viewContainer.clear();
                if (!!this.ngxPermissionsOnlyElse || this.ngxPermissionsElse) {
                    this.viewContainer.createEmbeddedView(this.ngxPermissionsOnlyElse || this.ngxPermissionsElse);
                }
        })
    }
}

export class EvryIfPermissionContext {
    public $implicit: any = null;
    public permissions: any = null;
}
