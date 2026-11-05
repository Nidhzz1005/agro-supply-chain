// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title SupplyChain
 * @dev Full-featured Agro Supply Chain with quantity tracking,
 *      batch splitting, shipment consolidation, and consumer purchases.
 */
contract SupplyChain {
    enum Status { PRODUCED, IN_TRANSIT, DELIVERED, PARTIALLY_SOLD, SOLD_OUT }

    struct Product {
        uint productId;
        address currentOwner;
        Status status;
        uint quantity;        // remaining quantity in kg
        uint originalQuantity;
    }

    struct Shipment {
        uint shipmentId;
        address distributor;
        uint[] productIds;    // consolidated product batch IDs
        bool dispatched;
    }

    uint public productCount = 0;
    uint public shipmentCount = 0;

    mapping(uint => Product) public products;
    mapping(uint => Shipment) public shipments;

    event ProductCreated(uint productId, address owner, uint quantity);
    event StatusUpdated(uint productId, Status status, address updatedBy);
    event ShipmentCreated(uint shipmentId, address distributor, uint[] productIds);
    event QuantitySold(uint productId, uint qtySold, uint remaining);

    // Producer creates a product with quantity
    function createProduct(uint quantity) external returns (uint) {
        uint newId = productCount;
        products[newId] = Product({
            productId: newId,
            currentOwner: msg.sender,
            status: Status.PRODUCED,
            quantity: quantity,
            originalQuantity: quantity
        });
        productCount++;
        emit ProductCreated(newId, msg.sender, quantity);
        return newId;
    }

    // Distributor consolidates multiple products into one shipment
    function createShipment(uint[] calldata productIds) external returns (uint) {
        uint newId = shipmentCount;
        shipments[newId] = Shipment({
            shipmentId: newId,
            distributor: msg.sender,
            productIds: productIds,
            dispatched: false
        });
        // Mark all products as IN_TRANSIT
        for (uint i = 0; i < productIds.length; i++) {
            require(productIds[i] < productCount, "Product does not exist");
            products[productIds[i]].status = Status.IN_TRANSIT;
            products[productIds[i]].currentOwner = msg.sender;
            emit StatusUpdated(productIds[i], Status.IN_TRANSIT, msg.sender);
        }
        shipmentCount++;
        emit ShipmentCreated(newId, msg.sender, productIds);
        return newId;
    }

    // Retailer marks a product as delivered
    function markDelivered(uint productId) external {
        require(productId < productCount, "Product does not exist");
        require(products[productId].status == Status.IN_TRANSIT, "Product not in transit");
        products[productId].status = Status.DELIVERED;
        products[productId].currentOwner = msg.sender;
        emit StatusUpdated(productId, Status.DELIVERED, msg.sender);
    }

    // Retailer sells a partial quantity to a consumer
    function sellQuantity(uint productId, uint qty) external {
        require(productId < productCount, "Product does not exist");
        require(products[productId].status == Status.DELIVERED ||
                products[productId].status == Status.PARTIALLY_SOLD, "Product not available for sale");
        require(qty > 0 && qty <= products[productId].quantity, "Invalid quantity");

        products[productId].quantity -= qty;

        if (products[productId].quantity == 0) {
            products[productId].status = Status.SOLD_OUT;
        } else {
            products[productId].status = Status.PARTIALLY_SOLD;
        }

        emit QuantitySold(productId, qty, products[productId].quantity);
    }

    // Simple status update (backward compat)
    function updateStatus(uint productId, uint newStatus) external {
        require(productId < productCount, "Product does not exist");
        require(newStatus < 5, "Invalid status");
        products[productId].status = Status(newStatus);
        products[productId].currentOwner = msg.sender;
        emit StatusUpdated(productId, Status(newStatus), msg.sender);
    }

    function getProduct(uint productId) external view returns (Product memory) {
        require(productId < productCount, "Product does not exist");
        return products[productId];
    }

    function getShipment(uint shipmentId) external view returns (Shipment memory) {
        require(shipmentId < shipmentCount, "Shipment does not exist");
        return shipments[shipmentId];
    }
}
