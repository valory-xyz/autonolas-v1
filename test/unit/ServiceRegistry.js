/*global describe, context, beforeEach, it*/

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ServiceRegistry", function () {
    let componentRegistry;
    let agentRegistry;
    let serviceRegistry;
    let signers;
    const name = "service name";
    const description = "service description";
    const configHash = {hash: "0x" + "5".repeat(64), hashFunction: "0x12", size: "0x20"};
    const configHash1 = {hash: "0x" + "6".repeat(64), hashFunction: "0x12", size: "0x20"};
    const regBond = 1000;
    const regDeposit = 1000;
    const agentIds = [1, 2];
    const agentParams = [[3, regBond], [4, regBond]];
    const serviceId = 1;
    const agentId = 1;
    const threshold = 1;
    const maxThreshold = agentParams[0][0] + agentParams[1][0];
    const componentHash = {hash: "0x" + "0".repeat(64), hashFunction: "0x12", size: "0x20"};
    const componentHash1 = {hash: "0x" + "1".repeat(64), hashFunction: "0x12", size: "0x20"};
    const componentHash2 = {hash: "0x" + "2".repeat(64), hashFunction: "0x12", size: "0x20"};
    const agentHash = {hash: "0x" + "7".repeat(64), hashFunction: "0x12", size: "0x20"};
    const agentHash1 = {hash: "0x" + "8".repeat(64), hashFunction: "0x12", size: "0x20"};
    const AddressZero = "0x" + "0".repeat(40);
    // Deadline must be bigger than minimum deadline plus current block number. However hardhat keeps on increasing
    // block number for each test, so we set a high enough value here, and in time sensitive tests use current blocks
    const regDeadline = 100000;
    beforeEach(async function () {
        const ComponentRegistry = await ethers.getContractFactory("ComponentRegistry");
        componentRegistry = await ComponentRegistry.deploy("agent components", "MECHCOMP",
            "https://localhost/component/");
        await componentRegistry.deployed();

        const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy("agent", "MECH", "https://localhost/agent/",
            componentRegistry.address);
        await agentRegistry.deployed();

        const GnosisSafeL2 = await ethers.getContractFactory("GnosisSafeL2");
        const gnosisSafeL2 = await GnosisSafeL2.deploy();
        await gnosisSafeL2.deployed();

        const GnosisSafeProxyFactory = await ethers.getContractFactory("GnosisSafeProxyFactory");
        const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
        await gnosisSafeProxyFactory.deployed();

        const ServiceRegistry = await ethers.getContractFactory("ServiceRegistry");
        serviceRegistry = await ServiceRegistry.deploy(agentRegistry.address, gnosisSafeL2.address,
            gnosisSafeProxyFactory.address);
        await serviceRegistry.deployed();
        signers = await ethers.getSigners();
    });

    context("Initialization", async function () {
        it("Should fail when checking for the service id existence", async function () {
            const tokenId = 0;
            expect(await serviceRegistry.exists(tokenId)).to.equal(false);
        });

        it("Should fail when trying to change the serviceManager from a different address", async function () {
            await expect(
                serviceRegistry.connect(signers[3]).changeManager(signers[3].address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    context("Service creation", async function () {
        it("Should fail when creating a service without a serviceManager", async function () {
            const owner = signers[3].address;
            await expect(
                serviceRegistry.createService(owner, name, description, configHash, agentIds, agentParams, threshold)
            ).to.be.revertedWith("ManagerOnly");
        });

        it("Should fail when the owner of a service has zero address", async function () {
            const serviceManager = signers[3];
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(AddressZero, name, description, configHash, agentIds,
                    agentParams, threshold)
            ).to.be.revertedWith("ZeroAddress");
        });

        it("Should fail when creating a service with an empty name", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, "", description, configHash, agentIds,
                    agentParams, threshold)
            ).to.be.revertedWith("EmptyString");
        });

        it("Should fail when creating a service with an empty description", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, "", configHash, agentIds, agentParams,
                    threshold)
            ).to.be.revertedWith("EmptyString");
        });

        it("Should fail when creating a service with a wrong config IPFS hash header", async function () {
            const wrongConfigHashes = [ {hash: "0x" + "0".repeat(64), hashFunction: "0x11", size: "0x20"},
                {hash: "0x" + "0".repeat(64), hashFunction: "0x12", size: "0x19"}];
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, wrongConfigHashes[0],
                    agentIds, agentParams, threshold)
            ).to.be.revertedWith("WrongHash");
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, wrongConfigHashes[1],
                    agentIds, agentParams, threshold)
            ).to.be.revertedWith("WrongHash");
        });

        it("Should fail when creating a service with incorrect agent slots values", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [], [], threshold)
            ).to.be.revertedWith("WrongAgentIdsData");
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1], [], threshold)
            ).to.be.revertedWith("WrongAgentIdsData");
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1, 3], [[2, regBond]],
                    threshold)
            ).to.be.revertedWith("WrongAgentIdsData");
        });

        it("Should fail when creating a service with non existent canonical agent", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                    agentParams, threshold)
            ).to.be.revertedWith("WrongAgentId");
        });

        it("Should fail when creating a service with duplicate canonical agents in agent slots", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1, 1],
                    [[2, regBond], [2, regBond]], threshold)
            ).to.be.revertedWith("WrongAgentId");
        });

        it("Should fail when creating a service with incorrect input parameter", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1, 0],
                    [[2, regBond], [2, regBond]], threshold)
            ).to.be.revertedWith("WrongAgentId");
        });

        it("Should fail when trying to set empty agent slots", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                    [[3, regBond], [0, regBond]], threshold)
            ).to.be.revertedWith("ZeroValue");
        });

        it("Checking for different signers threshold combinations", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const minThreshold = Math.floor(maxThreshold * 2 / 3 + 1);
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            console.log();
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                    agentParams, minThreshold - 1)
            ).to.be.revertedWith("WrongThreshold");
            await expect(
                serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                    agentParams, maxThreshold + 1)
            ).to.be.revertedWith("WrongThreshold");
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, minThreshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
        });

        it("Catching \"CreateService\" event log after registration of a service", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            const service = await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash,
                agentIds, agentParams, maxThreshold);
            const result = await service.wait();
            expect(result.events[0].event).to.equal("CreateService");
        });

        it("Service Id=1 after first successful service registration must exist", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            expect(await serviceRegistry.exists(1)).to.equal(true);
        });
    });

    context("Service update", async function () {
        it("Should fail when creating a service without a serviceManager", async function () {
            const owner = signers[3].address;
            await expect(
                serviceRegistry.createService(owner, name, description, configHash, agentIds, agentParams, threshold)
            ).to.be.revertedWith("ManagerOnly");
        });

        it("Should fail when the owner of a service has zero address", async function () {
            const serviceManager = signers[3];
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).update(AddressZero, name, description, configHash, agentIds,
                    agentParams, threshold, 0)
            ).to.be.revertedWith("ServiceNotFound");
        });

        it("Should fail when trying to update a non-existent service", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).update(owner, name, description, configHash, agentIds,
                    agentParams, threshold, 0)
            ).to.be.revertedWith("ServiceNotFound");
        });

        it("Catching \"UpdateService\" event log after update of a service", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            const service = await serviceRegistry.connect(serviceManager).update(owner, name, description, configHash,
                agentIds, agentParams, maxThreshold, 1);
            const result = await service.wait();
            expect(result.events[0].event).to.equal("UpdateService");
            expect(await serviceRegistry.exists(1)).to.equal(true);
            expect(await serviceRegistry.exists(2)).to.equal(false);
        });

        it("Should fail when trying to update the service with already registered agent instances", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});
            await expect(
                serviceRegistry.connect(serviceManager).update(owner, name, description, configHash, agentIds,
                    agentParams, maxThreshold, 1)
            ).to.be.revertedWith("AgentInstanceRegistered");
        });

        it("Update specifically for hashes, then get service hashes", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);

            // If we update with the same config hash as previous one, it must not be added
            await serviceRegistry.connect(serviceManager).update(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold, 1);
            let hashes = await serviceRegistry.getConfigHashes(serviceId);
            expect(hashes.numHashes).to.equal(1);
            expect(hashes.configHashes[0].hash).to.equal(configHash.hash);

            // Now we are going to have two config hashes
            await serviceRegistry.connect(serviceManager).update(owner, name, description, configHash1, agentIds,
                agentParams, maxThreshold, 1);
            hashes = await serviceRegistry.getConfigHashes(serviceId);
            expect(hashes.numHashes).to.equal(2);
            expect(hashes.configHashes[0].hash).to.equal(configHash.hash);
            expect(hashes.configHashes[1].hash).to.equal(configHash1.hash);
        });
    });

    context("Register agent instance", async function () {
        it("Should fail when registering an agent instance without a serviceManager", async function () {
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await expect(
                serviceRegistry.registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond})
            ).to.be.revertedWith("ManagerOnly");
        });

        it("Should fail when registering an agent instance with a non-existent service", async function () {
            const serviceManager = signers[4];
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond})
            ).to.be.revertedWith("ServiceDoesNotExist");
        });

        it("Should fail when registering an agent instance for the inactive service", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond})
            ).to.be.revertedWith("WrongServiceState");
        });

        it("Should fail when registering an agent instance that is already registered", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description,
                []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond})
            ).to.be.revertedWith("AgentInstanceRegistered");
        });

        it("Should fail when registering an agent instance for non existent canonical agent Id", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, 0, {value: regBond})
            ).to.be.revertedWith("AgentNotInService");
        });

        it("Should fail when registering an agent instance for the service with no available slots", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = [signers[7].address, signers[8].address, signers[9].address, signers[10].address];
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance[1], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance[2], agentId, {value: regBond});
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance[3], agentId, {value: regBond})
            ).to.be.revertedWith("AgentInstancesSlotsFilled");
        });

        it("Catching \"RegisterInstance\" event log after agent instance registration", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            const regAgent = await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId,
                agentInstance, agentId, {value: regBond});
            const result = await regAgent.wait();
            expect(result.events[1].event).to.equal("RegisterInstance");
        });

        it("Registering several agent instances in different services by the same operator", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = [signers[7].address, signers[8].address, signers[9].address];
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId + 1, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId + 1, agentInstance[1],
                agentId, {value: regBond});
            const regAgent = await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId,
                agentInstance[2], agentId, {value: regBond});
            const result = await regAgent.wait();
            expect(result.events[1].event).to.equal("RegisterInstance");
        });

        it("Should fail when registering an agent instance with the same address as operator", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address];
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(agentInstances[0], serviceId, agentInstances[0], agentId, {value: regBond})
            ).to.be.revertedWith("WrongOperator");
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[0], agentId, {value: regBond});
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(agentInstances[0], serviceId, agentInstances[1], agentId, {value: regBond})
            ).to.be.revertedWith("WrongOperator");
        });
    });

    context("activateRegistration / deactivateRegistration / destroy the service", async function () {
        it("Should fail when activating a service without a serviceManager", async function () {
            const owner = signers[3].address;
            await expect(
                serviceRegistry.activateRegistration(owner, serviceId, regDeadline)
            ).to.be.revertedWith("ManagerOnly");
        });

        it("Should fail when activating a non-existent service", async function () {
            const serviceManager = signers[3];
            const owner = signers[4].address;
            await serviceRegistry.changeManager(serviceManager.address);
            await expect(
                serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId + 1, regDeadline)
            ).to.be.revertedWith("ServiceNotFound");
        });

        it("Should fail when activating a service that is already active", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline)
            ).to.be.revertedWith("ServiceMustBeInactive");
        });

        it("Catching \"ActivateRegistration\" event log after service activation", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;

            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            const activateService = await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId,
                regDeadline);
            const result = await activateService.wait();
            expect(result.events[0].event).to.equal("ActivateRegistration");
        });

        it("Catching \"TerminateService\" event log after service termination", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            const terminateService = await serviceRegistry.connect(serviceManager).terminate(owner, serviceId);
            const result = await terminateService.wait();
            expect(result.events[0].event).to.equal("TerminateService");
        });

        it("Destroying a service with at least one agent instance", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;

            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});
            const terminateService = await serviceRegistry.connect(serviceManager).terminate(owner, serviceId);
            const result = await terminateService.wait();
            expect(result.events[0].event).to.equal("TerminateService");
        });
    });

    context("Safe contract from agent instances", async function () {
        it("Should fail when creating a Safe without a full set of registered agent instances", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});
            await expect(
                serviceRegistry.connect(serviceManager).createSafe(owner, serviceId, AddressZero, "0x", AddressZero,
                    AddressZero, 0, AddressZero, serviceId)
            ).to.be.revertedWith("WrongServiceState");
        });

        it("Catching \"CreateSafeWithAgents\" event log when calling the Safe contract creation", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address, signers[9].address];
            const maxThreshold = 3;

            // Create components
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, [1]);

            // Create agents
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, [1]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, [1, 2]);

            // Create a service and activate the agent instance registration
            let state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(0);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1, 2],
                [[2, regBond], [1, regBond]], maxThreshold);
            state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(1);

            const nBlocks = Number(await serviceRegistry.getMinRegistrationDeadline());
            const blockNumber = await ethers.provider.getBlockNumber();
            // Deadline must be bigger than a current block number plus the minimum registration deadline
            const tDeadline = blockNumber + nBlocks + 10;
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, tDeadline);
            state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(2);
            const registartionDeadline = await serviceRegistry.getRegistrationDeadline(serviceId);
            expect(registartionDeadline).to.equal(tDeadline);

            /// Register agent instances
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[1], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[2], agentId + 1, {value: regBond});
            state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(4);

            // Create safe
            const safe = await serviceRegistry.connect(serviceManager).createSafe(owner, serviceId, AddressZero, "0x",
                AddressZero, AddressZero, 0, AddressZero, serviceId);
            const result = await safe.wait();
            expect(result.events[2].event).to.equal("CreateSafeWithAgents");
            state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(5);

            // Check the service info
            const serviceIdFromAgentId = await serviceRegistry.getServiceIdsCreatedWithAgentId(agentId);
            expect(serviceIdFromAgentId.numServiceIds).to.equal(1);
            expect(serviceIdFromAgentId.serviceIds[0]).to.equal(serviceId);
            for (let i = 1; i < 2; i++) {
                const serviceIdFromComponentId = await serviceRegistry.getServiceIdsCreatedWithComponentId(i);
                expect(serviceIdFromComponentId.numServiceIds).to.equal(1);
                expect(serviceIdFromComponentId.serviceIds[0]).to.equal(serviceId);
            }
        });

        it("Making sure we get correct mapping of _mapComponentIdSetServices formed", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address, signers[9].address, signers[10].address];
            const maxThreshold = 2;

            // Create components
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, [1]);

            // Create agents
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, [1]);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash1, description, [1, 2]);

            // Create services and activate the agent instance registration
            let state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(0);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash1, [2],
                [[2, regBond]], maxThreshold);

            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId + 1, regDeadline);

            /// Register agent instances
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[1], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId + 1, agentInstances[2], agentId + 1, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId + 1, agentInstances[3], agentId + 1, {value: regBond});

            await serviceRegistry.connect(serviceManager).createSafe(owner, serviceId, AddressZero, "0x",
                AddressZero, AddressZero, 0, AddressZero, serviceId);
            await serviceRegistry.connect(serviceManager).createSafe(owner, serviceId + 1, AddressZero, "0x",
                AddressZero, AddressZero, 0, AddressZero, serviceId);
        });
    });

    context("High-level read-only service info requests", async function () {
        it("Should fail when requesting info about a non-existent service", async function () {
            const owner = signers[3].address;
            expect(await serviceRegistry.balanceOf(owner)).to.equal(0);

            await expect(
                serviceRegistry.ownerOf(serviceId)
            ).to.be.revertedWith("ServiceDoesNotExist");

            await expect(
                serviceRegistry.getServiceInfo(serviceId)
            ).to.be.revertedWith("ServiceDoesNotExist");
        });

        it("Obtaining information about service existence, balance, owner, service info", async function () {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);

            // Initially owner does not have any services
            expect(await serviceRegistry.exists(serviceId)).to.equal(false);
            expect(await serviceRegistry.balanceOf(owner)).to.equal(0);

            // Creating a service
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);

            // Initial checks
            expect(await serviceRegistry.exists(serviceId)).to.equal(true);
            expect(await serviceRegistry.balanceOf(owner)).to.equal(1);
            expect(await serviceRegistry.ownerOf(serviceId)).to.equal(owner);

            // Check for the service info components
            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.owner).to.equal(owner);
            expect(serviceInfo.name).to.equal(name);
            expect(serviceInfo.description).to.equal(description);
            expect(serviceInfo.numAgentIds).to.equal(agentIds.length);
            expect(serviceInfo.configHash.hash).to.equal(configHash.hash);
            for (let i = 0; i < agentIds.length; i++) {
                expect(serviceInfo.agentIds[i]).to.equal(agentIds[i]);
            }
            for (let i = 0; i < agentParams.length; i++) {
                expect(serviceInfo.agentParams[i].slots).to.equal(agentParams[i][0]);
                expect(serviceInfo.agentParams[i].bond).to.equal(agentParams[i][1]);
            }
        });

        it("Obtaining service information after update and creating one more service", async function () {
            const mechManager = signers[1];
            const serviceManager = signers[2];
            const owner = signers[3].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash2, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);

            // Updating a service
            const newAgentIds = [1, 2, 3];
            const newAgentParams = [[2, regBond], [0, regBond], [1, regBond]];
            const newMaxThreshold = newAgentParams[0][0] + newAgentParams[2][0];
            await serviceRegistry.connect(serviceManager).update(owner, name, description, configHash, newAgentIds,
                newAgentParams, newMaxThreshold, serviceId);

            // Initial checks
            expect(await serviceRegistry.exists(serviceId)).to.equal(true);
            expect(await serviceRegistry.balanceOf(owner)).to.equal(1);
            expect(await serviceRegistry.ownerOf(serviceId)).to.equal(owner);
            let totalSupply = await serviceRegistry.totalSupply();
            expect(totalSupply.actualNumServices).to.equal(1);
            expect(totalSupply.maxServiceId).to.equal(1);

            // Check for the service info components
            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.owner).to.equal(owner);
            expect(serviceInfo.name).to.equal(name);
            expect(serviceInfo.description).to.equal(description);
            expect(serviceInfo.numAgentIds).to.equal(agentIds.length);
            const agentIdsCheck = [newAgentIds[0], newAgentIds[2]];
            for (let i = 0; i < agentIds.length; i++) {
                expect(serviceInfo.agentIds[i]).to.equal(agentIdsCheck[i]);
            }
            const agentNumSlotsCheck = [newAgentParams[0], newAgentParams[2]];
            for (let i = 0; i < agentNumSlotsCheck.length; i++) {
                expect(serviceInfo.agentParams[i].slots).to.equal(agentNumSlotsCheck[i][0]);
                expect(serviceInfo.agentParams[i].bond).to.equal(agentNumSlotsCheck[i][1]);
            }
            const agentInstancesInfo = await serviceRegistry.getInstancesForAgentId(serviceId, agentId);
            expect(agentInstancesInfo.numAgentInstances).to.equal(0);

            // Creating a second service and do basic checks
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIdsCheck,
                agentNumSlotsCheck, newMaxThreshold);
            expect(await serviceRegistry.exists(serviceId + 1)).to.equal(true);
            expect(await serviceRegistry.balanceOf(owner)).to.equal(2);
            expect(await serviceRegistry.ownerOf(serviceId + 1)).to.equal(owner);
            const serviceIds = await serviceRegistry.getServiceIdsOfOwner(owner);
            expect(serviceIds[0] == 1 && serviceIds[1]).to.equal(2);
            totalSupply = await serviceRegistry.totalSupply();
            expect(totalSupply.actualNumServices).to.equal(2);
            expect(totalSupply.maxServiceId).to.equal(2);
        });

        it("Check for returned set of registered agent instances", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address];
            const maxThreshold = 2;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[1], agentId, {value: regBond});

            /// Get the service info
            const serviceInfo = await serviceRegistry.getServiceInfo(serviceId);
            expect(serviceInfo.numAagentInstances == agentInstances.length);
            for (let i = 0; i < agentInstances.length; i++) {
                expect(serviceInfo.agentInstances[i]).to.equal(agentInstances[i]);
            }
            const agentInstancesInfo = await serviceRegistry.getInstancesForAgentId(serviceId, agentId);
            expect(agentInstancesInfo.agentInstances == 2);
            for (let i = 0; i < agentInstances.length; i++) {
                expect(agentInstancesInfo.agentInstances[i]).to.equal(agentInstances[i]);
            }
        });

        it("Should fail when getting hashes of non-existent services", async function () {
            await expect(
                serviceRegistry.getConfigHashes(1)
            ).to.be.revertedWith("ServiceDoesNotExist");
        });
    });

    context("Deadlines", async function () {
        it("Manipulations with registration deadlines", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstances = [signers[7].address, signers[8].address];
            const maxThreshold = 2;

            // Create a component
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash2, description, [1]);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            const nBlocks = Number(await serviceRegistry.getMinRegistrationDeadline());
            const blockNumber = await ethers.provider.getBlockNumber();
            // Deadline must be bigger than a current block number plus the minimum registration deadline
            const tDeadline = blockNumber + nBlocks + 10;
            // Rejects if the registration deadline is not bigger than the minimum deadline
            await expect(
                serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, blockNumber + nBlocks)
            ).to.be.revertedWith("RegistrationDeadlineIncorrect");
            // Now deadline has a correct value
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, tDeadline);

            /// Register agent instances
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[0], agentId, {value: regBond});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstances[1], agentId, {value: regBond});

            // Since all instances are registered, we can change the deadline now to the current block
            const newBlockNumber = await ethers.provider.getBlockNumber() + 1;
            await serviceRegistry.connect(serviceManager).setRegistrationDeadline(owner, serviceId, newBlockNumber);

            // Cannot go below current block though
            await expect(
                serviceRegistry.connect(serviceManager).setRegistrationDeadline(owner, serviceId, 0)
            ).to.be.revertedWith("RegistrationDeadlineIncorrect");

            // It is not allowed also to move to a bigger block when all the instances are registered
            await expect(
                serviceRegistry.connect(serviceManager).setRegistrationDeadline(owner, serviceId, newBlockNumber + 10)
            ).to.be.revertedWith("RegistrationDeadlineChangeRedundant");
        });

        it("Setting different registration deadlines", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const maxThreshold = 2;

            // Create a component
            await componentRegistry.changeManager(mechManager.address);
            await componentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash2, description, [1]);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Trying to set the registration deadline before the registration is activated
            await expect(
                serviceRegistry.connect(serviceManager).setRegistrationDeadline(owner, serviceId, regDeadline)
            ).to.be.revertedWith("WrongServiceState");

            const nBlocks = Number(await serviceRegistry.getMinRegistrationDeadline());
            const blockNumber = await ethers.provider.getBlockNumber();
            // Deadline must be bigger than a current block number plus the minimum registration deadline
            const tDeadline = blockNumber + nBlocks + 10;

            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, tDeadline);

            // Trying to change the registration deadline below the minimum on while no one has registered yet
            await expect(
                serviceRegistry.connect(serviceManager).setRegistrationDeadline(owner, serviceId, nBlocks)
            ).to.be.revertedWith("RegistrationDeadlineIncorrect");
        });
    });

    context("Termination and unbonding", async function () {
        it("Should fail when trying to terminate service right after creation", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const maxThreshold = 2;

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Terminating service without registered agent instances will give it a terminated-unbonded state
            await expect(
                serviceRegistry.connect(serviceManager).terminate(owner, serviceId)
            ).to.be.revertedWith("WrongServiceState");
        });

        it("Terminate service right after creation and registering a single agent instance", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const agentInstance = signers[6].address;
            const operator = signers[7].address;
            const maxThreshold = 2;

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Activate registration and register one agent instance
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});

            // Terminating service with a registered agent instance will give it a terminated-bonded state
            await serviceRegistry.connect(serviceManager).terminate(owner, serviceId);
            const state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(6);

            // Trying to terminate it again will revert
            await expect(
                serviceRegistry.connect(serviceManager).terminate(owner, serviceId)
            ).to.be.revertedWith("WrongServiceState");
        });

        it("Unbond when the service registration is expired", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            const maxThreshold = 2;

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Setting a registration deadline that will need to be expired
            const nBlocks = Number(await serviceRegistry.getMinRegistrationDeadline());
            const blockNumber = await ethers.provider.getBlockNumber();
            const tDeadline = blockNumber + nBlocks + 10;

            // Activate registration and register one agent instance
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, tDeadline, {value: regDeposit});
            await serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance, agentId, {value: regBond});
            // Balance of the operator must be regBond
            const balanceOperator = Number(await serviceRegistry.mapOperatorsBalances(operator));
            expect(balanceOperator).to.equal(regBond);
            // Contract balance must be the sum of regBond and the regDeposit
            const contractBalance = Number(await ethers.provider.getBalance(serviceRegistry.address));
            expect(contractBalance).to.equal(regBond + regDeposit);

            // Trying to unbond before the deadline expiration
            await expect(
                serviceRegistry.connect(serviceManager).unbond(operator, serviceId)
            ).to.be.revertedWith("WrongServiceState");

            // Mining past the deadline
            for (let i = blockNumber; i <= tDeadline; i++) {
                ethers.provider.send("evm_mine");
            }

            // Try to unbond without termination of the service
            await expect(
                serviceRegistry.connect(serviceManager).unbond(operator, serviceId)
            ).to.be.revertedWith("WrongServiceState");

            // Terminate the service
            await serviceRegistry.connect(serviceManager).terminate(owner, serviceId);

            // Try to unbond by an operator that has not registered a single agent instance
            await expect(
                serviceRegistry.connect(serviceManager).unbond(owner, serviceId)
            ).to.be.revertedWith("OperatorHasNoInstances");

            // Unbonding
            await serviceRegistry.connect(serviceManager).unbond(operator, serviceId);
            const state = await serviceRegistry.getServiceState(serviceId);
            expect(state).to.equal(7);

            // Operator's balance after unbonding must be zero
            const newBalanceOperator = Number(await serviceRegistry.mapOperatorsBalances(operator));
            expect(newBalanceOperator).to.equal(0);
        });

        it("Should fail when unbond in the incorrect service state", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const maxThreshold = 2;

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Activate registration and try to unbond
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).unbond(operator, serviceId)
            ).to.be.revertedWith("WrongServiceState");
        });
    });

    context("Manipulations with payable set of functions or balance-related", async function () {
        it("Should revert when calling fallback and receive", async function () {
            const owner = signers[1];
            await expect(
                owner.sendTransaction({to: serviceRegistry.address, value: regBond})
            ).to.be.revertedWith("WrongFunction");

            await expect(
                owner.sendTransaction({to: serviceRegistry.address, value: regBond, data: "0x12"})
            ).to.be.revertedWith("WrongFunction");
        });

        it("Should revert when trying to register an agent instance with a smaller amount", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            const operator = signers[6].address;
            const agentInstance = signers[7].address;
            const maxThreshold = 2;

            // Create an agent
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, agentHash, description, []);

            // Create a service and activate the agent instance registration
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, [1],
                [[2, regBond]], maxThreshold);

            // Setting a registration deadline that will need to be expired
            const nBlocks = Number(await serviceRegistry.getMinRegistrationDeadline());
            const blockNumber = await ethers.provider.getBlockNumber();
            const tDeadline = blockNumber + nBlocks + 10;

            // Activate registration and register one agent instance
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, tDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).registerAgent(operator, serviceId, agentInstance,
                    agentId, {value: 0})
            ).to.be.revertedWith("InsufficientAgentBondingValue");
        });
    });


    context("Destroying the service", async function () {
        it("Should fail when calling destroy not from temnitated state", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);

            // Creating the service
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);

            // Trying to call destroy from pre-existent
            await expect(
                serviceRegistry.connect(serviceManager).destroy(owner, serviceId)
            ).to.be.revertedWith("WrongServiceState");

            // Activate registration
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await expect(
                serviceRegistry.connect(serviceManager).destroy(owner, serviceId)
            ).to.be.revertedWith("WrongServiceState");
        });

        it("Catching \"DestroyService\" event. Service is destroyed after its termination", async function () {
            const mechManager = signers[3];
            const serviceManager = signers[4];
            const owner = signers[5].address;
            await agentRegistry.changeManager(mechManager.address);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash, description, []);
            await agentRegistry.connect(mechManager).create(owner, owner, componentHash1, description, []);
            await serviceRegistry.changeManager(serviceManager.address);
            await serviceRegistry.connect(serviceManager).createService(owner, name, description, configHash, agentIds,
                agentParams, maxThreshold);
            await serviceRegistry.connect(serviceManager).activateRegistration(owner, serviceId, regDeadline);
            await serviceRegistry.connect(serviceManager).terminate(owner, serviceId);
            const destroyService = await serviceRegistry.connect(serviceManager).destroy(owner, serviceId);
            const result = await destroyService.wait();
            expect(result.events[0].event).to.equal("DestroyService");
        });
    });
});
