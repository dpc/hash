pub mod behavior_execution;
pub mod topology;

use serde::{Deserialize, Serialize};
use std::collections::hash_map::Iter;

use super::PackageCreator;
use crate::simulation::package::{
    id::{PackageId, PackageIdGenerator},
    PackageType,
};
use std::collections::HashMap;
use std::sync::Arc;

use crate::simulation::enum_dispatch::*;
use crate::simulation::{Error, Result};
use crate::ExperimentConfig;
use lazy_static::lazy_static;
use std::lazy::SyncOnceCell;
use strum_macros::IntoStaticStr;

use self::behavior_execution::tasks::{ExecuteBehaviorsTask, ExecuteBehaviorsTaskMessage};

/// All state package names are registered in this enum
#[derive(Debug, Clone, PartialEq, Eq, Hash, IntoStaticStr)]
pub enum Name {
    BehaviorExecution,
    Topology,
}

/// All state package tasks are registered in this enum
#[enum_dispatch(WorkerHandler, WorkerPoolHandler, GetTaskArgs)]
#[derive(Clone, Debug)]
pub enum StateTask {
    ExecuteBehaviorsTask,
}

/// All state package task messages are registered in this enum
#[enum_dispatch(RegisterWithoutTrait)]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum StateTaskMessage {
    ExecuteBehaviorsTaskMessage,
}

pub struct PackageCreators(SyncOnceCell<HashMap<Name, Box<dyn super::PackageCreator>>>);

pub static PACKAGE_CREATORS: PackageCreators = PackageCreators(SyncOnceCell::new());

impl PackageCreators {
    pub(crate) fn initialize_for_experiment_run(
        &self,
        experiment_config: &Arc<ExperimentConfig>,
    ) -> Result<()> {
        use Name::*;
        let mut m = HashMap::new();
        m.insert(
            BehaviorExecution,
            behavior_execution::Creator::new(experiment_config)?,
        );
        m.insert(Topology, topology::Creator::new(experiment_config)?);
        self.0
            .set(m)
            .map_err(|_| Error::from("Failed to initialize State Package Creators"))?;
        Ok(())
    }

    pub(crate) fn get_checked(&self, name: &Name) -> Result<&Box<dyn super::PackageCreator>> {
        Ok(self
            .0
            .get()
            .ok_or_else(|| Error::from("State Package Creators weren't initialized"))?
            .get(name)
            .ok_or_else(|| {
                let pkg_name: &str = name.into();
                Error::from(format!(
                    "Package creator: {} wasn't within the State Package Creators map",
                    pkg_name
                ))
            })?)
    }

    #[allow(dead_code)] // It is used in a test in deps.rs but the compiler fails to pick it up
    pub(crate) fn iter_checked(&self) -> Result<Iter<Name, Box<dyn super::PackageCreator>>> {
        Ok(self
            .0
            .get()
            .ok_or_else(|| Error::from("State Package Creators weren't initialized"))?
            .iter())
    }
}

lazy_static! {
    pub static ref IDS: HashMap<Name, PackageId> = {
        use Name::*;
        let mut creator = PackageIdGenerator::new(PackageType::State);
        let mut m = HashMap::new();
        m.insert(BehaviorExecution, creator.next());
        m.insert(Topology, creator.next());
        m
    };
}
