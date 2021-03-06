import * as _ from 'lodash';
import * as React from 'react';
import { asAccessReview, Kebab, KebabOption } from '@console/internal/components/utils';
import { K8sKind, K8sResourceCommon, K8sResourceKind, PodKind } from '@console/internal/module/k8s';
import { getName, getNamespace } from '@console/shared';
import { confirmModal, deleteModal } from '@console/internal/components/modals';
import { ModifyApplication } from '@console/dev-console/src/actions/modify-application';
import { VMIKind, VMKind } from '../../types/vm';
import {
  isVMCreated,
  isVMExpectedRunning,
  isVMRunningOrExpectedRunning,
} from '../../selectors/vm/selectors';
import { getMigrationVMIName } from '../../selectors/vmi-migration';
import { VirtualMachineInstanceMigrationModel } from '../../models';
import { restartVM, startVM, stopVM, VMActionType } from '../../k8s/requests/vm';
import { startVMIMigration } from '../../k8s/requests/vmi';
import { cancelMigration } from '../../k8s/requests/vmim';
import { cloneVMModal } from '../modals/clone-vm-modal';
import { VMCDRomModal } from '../modals/cdrom-vm-modal/vm-cdrom-modal';
import { getVMStatus } from '../../statuses/vm/vm-status';
import { isVMIPaused } from '../../selectors/vmi';
import { unpauseVMI, VMIActionType } from '../../k8s/requests/vmi/actions';
import { VMImportKind } from '../../types/vm-import/ovirt/vm-import';
import { V1alpha1DataVolume } from '../../types/vm/disk/V1alpha1DataVolume';
import { VMStatusBundle } from '../../statuses/vm/types';
import { deleteVMLikeEntityModal } from '../modals/delete-vm-like-entity-modal/delete-vm-like-entity-modal';

type ActionArgs = {
  vmi?: VMIKind;
  vmStatusBundle?: VMStatusBundle;
};

const getActionMessage = (obj: K8sResourceCommon, action: VMActionType | VMIActionType) => (
  <>
    Are you sure you want to {action} <strong>{getName(obj)}</strong> in namespace{' '}
    <strong>{getNamespace(obj)}</strong>?
  </>
);

export const menuActionStart = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle }: ActionArgs,
): KebabOption => {
  const title = 'Start Virtual Machine';
  return {
    hidden:
      vmStatusBundle?.status?.isImporting() ||
      vmStatusBundle?.status?.isMigrating() ||
      isVMRunningOrExpectedRunning(vm),
    label: title,
    callback: () => startVM(vm),
    accessReview: asAccessReview(kindObj, vm, 'patch'),
  };
};

const menuActionStop = (kindObj: K8sKind, vm: VMKind): KebabOption => {
  const title = 'Stop Virtual Machine';
  return {
    hidden: !isVMExpectedRunning(vm),
    label: title,
    callback: () =>
      confirmModal({
        title,
        message: getActionMessage(vm, VMActionType.Stop),
        btnText: _.capitalize(VMActionType.Stop),
        executeFn: () => stopVM(vm),
      }),
    accessReview: asAccessReview(kindObj, vm, 'patch'),
  };
};

const menuActionRestart = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle }: ActionArgs,
): KebabOption => {
  const title = 'Restart Virtual Machine';
  return {
    hidden:
      vmStatusBundle?.status?.isImporting() ||
      vmStatusBundle?.status?.isMigrating() ||
      !isVMExpectedRunning(vm) ||
      !isVMCreated(vm),
    label: title,
    callback: () =>
      confirmModal({
        title,
        message: getActionMessage(vm, VMActionType.Restart),
        btnText: _.capitalize(VMActionType.Restart),
        executeFn: () => restartVM(vm),
      }),
    accessReview: asAccessReview(kindObj, vm, 'patch'),
  };
};

const menuActionUnpause = (kindObj: K8sKind, vm: VMKind, { vmi }: ActionArgs): KebabOption => {
  const title = 'Unpause Virtual Machine';
  return {
    hidden: !isVMIPaused(vmi),
    label: title,
    callback: () =>
      confirmModal({
        title,
        message: getActionMessage(vmi, VMIActionType.Unpause),
        btnText: _.capitalize(VMIActionType.Unpause),
        executeFn: () => unpauseVMI(vmi),
      }),
  };
};

const menuActionMigrate = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle, vmi }: ActionArgs,
): KebabOption => {
  const title = 'Migrate Virtual Machine';
  return {
    hidden:
      vmStatusBundle?.status?.isImporting() ||
      vmStatusBundle?.status?.isMigrating() ||
      !isVMExpectedRunning(vm) ||
      !isVMCreated(vm),
    label: title,
    callback: () =>
      confirmModal({
        title,
        message: (
          <>
            Do you wish to migrate <strong>{getName(vmi)}</strong> vmi to another node?
          </>
        ),
        btnText: 'Migrate',
        executeFn: () => startVMIMigration(vmi),
      }),
  };
};

const menuActionCancelMigration = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle }: ActionArgs,
): KebabOption => {
  const title = 'Cancel Virtual Machine Migration';
  const migration = vmStatusBundle?.migration;
  return {
    hidden: !vmStatusBundle?.status?.isMigrating(),
    label: title,
    callback: () =>
      confirmModal({
        title,
        message: (
          <>
            Are you sure you want to cancel <strong>{getMigrationVMIName(migration)}</strong>{' '}
            migration in <strong>{getNamespace(migration)}</strong> namespace?
          </>
        ),
        btnText: 'Cancel Migration',
        executeFn: () => cancelMigration(migration),
      }),
    accessReview:
      migration && asAccessReview(VirtualMachineInstanceMigrationModel, migration, 'delete'),
  };
};

const menuActionClone = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle }: ActionArgs,
): KebabOption => {
  return {
    hidden: vmStatusBundle?.status?.isImporting(),
    label: 'Clone Virtual Machine',
    callback: () => cloneVMModal({ vm }),
    accessReview: asAccessReview(kindObj, vm, 'patch'),
  };
};

const menuActionCdEdit = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmStatusBundle }: ActionArgs,
): KebabOption => {
  return {
    hidden:
      vmStatusBundle?.status?.isImporting() ||
      vmStatusBundle?.status?.isMigrating() ||
      isVMRunningOrExpectedRunning(vm),
    label: 'Edit CD-ROMs',
    callback: () => VMCDRomModal({ vmLikeEntity: vm, modalClassName: 'modal-lg' }),
    accessReview: asAccessReview(kindObj, vm, 'patch'),
  };
};

export const menuActionDeleteVM = (kindObj: K8sKind, vm: VMKind): KebabOption => ({
  label: `Delete ${kindObj.label}`,
  callback: () =>
    deleteVMLikeEntityModal({
      vmLikeEntity: vm,
    }),
  accessReview: asAccessReview(kindObj, vm, 'delete'),
});

export const menuActionDeleteVMI = (kindObj: K8sKind, vmi: VMIKind): KebabOption => ({
  label: `Delete ${kindObj.label}`,
  callback: () =>
    deleteModal({
      kind: kindObj,
      resource: vmi,
      redirectTo: `/k8s/ns/${getNamespace(vmi)}/virtualization`,
    }),
  accessReview: asAccessReview(kindObj, vmi, 'delete'),
});

export const vmMenuActions = [
  ModifyApplication,
  menuActionStart,
  menuActionStop,
  menuActionRestart,
  menuActionUnpause,
  menuActionMigrate,
  menuActionCancelMigration,
  menuActionClone,
  menuActionCdEdit,
  Kebab.factory.ModifyLabels,
  Kebab.factory.ModifyAnnotations,
  menuActionDeleteVM,
];

export const vmiMenuActions = [
  Kebab.factory.ModifyLabels,
  Kebab.factory.ModifyAnnotations,
  menuActionDeleteVMI,
];

export const vmImportMenuActions = [
  Kebab.factory.ModifyLabels,
  Kebab.factory.ModifyAnnotations,
  Kebab.factory.Delete,
];

export type ExtraResources = {
  vmis: VMIKind[];
  pods: PodKind[];
  migrations: K8sResourceKind[];
  dataVolumes: V1alpha1DataVolume[];
  vmImports: VMImportKind[];
};

export const vmMenuActionsCreator = (
  kindObj: K8sKind,
  vm: VMKind,
  { vmis, pods, migrations, vmImports, dataVolumes }: ExtraResources,
) => {
  const vmi = vmis && vmis[0];
  const vmStatusBundle = getVMStatus({ vm, vmi, pods, migrations, dataVolumes, vmImports });

  return vmMenuActions.map((action) => {
    return action(kindObj, vm, { vmi, vmStatusBundle });
  });
};

export const vmiMenuActionsCreator = (kindObj: K8sKind, vmi: VMIKind) => {
  return vmiMenuActions.map((action) => {
    return action(kindObj, vmi);
  });
};
