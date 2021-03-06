import { Confirm, Modal } from "reactjs-components";
import { routerShape } from "react-router";
import PureRender from "react-addons-pure-render-mixin";
import React, { PropTypes } from "react";
import { injectIntl, intlShape } from "react-intl";

import ModalHeading from "#SRC/js/components/modals/ModalHeading";
import StringUtil from "#SRC/js/utils/StringUtil";
import UserActions from "#SRC/js/constants/UserActions";
import ClickToSelect from "#SRC/js/components/ClickToSelect";

import AppLockedMessage from "./AppLockedMessage";
import Framework from "../../structs/Framework";
import Pod from "../../structs/Pod";
import Service from "../../structs/Service";
import ServiceTree from "../../structs/ServiceTree";

// This needs to be at least equal to @modal-animation-duration
const REDIRECT_DELAY = 300;
const METHODS_TO_BIND = [
  "handleChangeInputFieldDestroy",
  "handleModalClose",
  "handleRightButtonClick"
];

class ServiceDestroyModal extends React.Component {
  constructor() {
    super(...arguments);

    this.state = {
      errorMsg: null,
      serviceNameConfirmationValue: ""
    };

    this.shouldComponentUpdate = PureRender.shouldComponentUpdate.bind(this);

    METHODS_TO_BIND.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  componentWillUpdate(nextProps) {
    const requestCompleted = this.props.isPending && !nextProps.isPending;

    const shouldClose = requestCompleted && !nextProps.errors;

    if (shouldClose) {
      this.redirectToServices();
    }
  }

  componentWillReceiveProps(nextProps) {
    const { errors } = nextProps;
    if (!errors) {
      this.setState({ errorMsg: null });

      return;
    }

    if (typeof errors === "string") {
      this.setState({ errorMsg: errors });

      return;
    }

    let { message: errorMsg = "", details } = errors;
    const hasDetails = details && details.length !== 0;

    if (hasDetails) {
      errorMsg = details.reduce(function(memo, error) {
        return `${memo} ${error.errors.join(" ")}`;
      }, "");
    }

    if (!errorMsg || !errorMsg.length) {
      errorMsg = null;
    }

    this.setState({ errorMsg });
  }

  shouldForceUpdate() {
    return this.state.errorMsg && /force=true/.test(this.state.errorMsg);
  }

  handleModalClose() {
    this.setState({ serviceNameConfirmationValue: "" });
    this.props.onClose();
  }

  handleRightButtonClick() {
    if (!this.getIsRightButtonDisabled()) {
      this.props.deleteItem(this.shouldForceUpdate());
      this.setState({ serviceNameConfirmationValue: "" });
    }
  }

  handleChangeInputFieldDestroy(event) {
    this.setState({
      serviceNameConfirmationValue: event.target.value
    });
  }

  getIsRightButtonDisabled() {
    return (
      this.props.service.getName() !== this.state.serviceNameConfirmationValue
    );
  }

  getErrorMessage() {
    const { errorMsg = null } = this.state;

    if (!errorMsg) {
      return null;
    }

    if (this.shouldForceUpdate()) {
      return <AppLockedMessage service={this.props.service} />;
    }

    return (
      <h4 className="text-align-center text-danger flush-top">{errorMsg}</h4>
    );
  }

  redirectToServices() {
    const { router } = this.context;

    // Close the modal and redirect after the close animation has completed
    this.handleModalClose();
    setTimeout(() => {
      router.push({ pathname: "/services/overview" });
    }, REDIRECT_DELAY);
  }

  getCloseButton() {
    return (
      <div className="row text-align-center">
        <button
          className="button button-primary button-medium"
          onClick={this.handleModalClose}
        >
          Close
        </button>
      </div>
    );
  }

  getDestroyFrameworkModal() {
    const { open, service, intl } = this.props;
    const packageName = service.getPackageName();

    return (
      <Modal
        header={this.getModalHeading()}
        footer={this.getCloseButton()}
        modalClass="modal"
        onClose={this.handleModalClose}
        open={open}
        showHeader={true}
        showFooter={true}
        subHeader={this.getSubHeader()}
      >
        <p>
          {intl.formatMessage({
            id: "SERVICE_ACTIONS.DELETE_SERVICE_FRAMEWORK"
          })}
          <a
            href="https://docs.mesosphere.com/service-docs/"
            target="_blank"
            title={intl.formatMessage({
              id: "COMMON.DOCUMENTATION_TITLE"
            })}
          >
            {intl.formatMessage({
              id: "COMMON.DOCUMENTATION"
            })}
          </a>
          {intl.formatMessage({
            id: "SERVICE_ACTIONS.DELETE_SERVICE_FRAMEWORK_2"
          })}
        </p>
        <div className="flush-top snippet-wrapper">
          <ClickToSelect>
            <pre className="prettyprint flush-bottom">
              dcos package uninstall
              {" "}
              {packageName} --app-id={service.getId()}
            </pre>
          </ClickToSelect>
        </div>
        {this.getErrorMessage()}
      </Modal>
    );
  }

  getDestroyServiceModal() {
    const { open, service } = this.props;
    const serviceName = service.getName();
    const serviceLabel = this.getServiceLabel();
    const itemText = `${StringUtil.capitalize(UserActions.DELETE)} ${serviceLabel}`;

    return (
      <Confirm
        disabled={this.getIsRightButtonDisabled()}
        header={this.getModalHeading()}
        open={open}
        onClose={this.handleModalClose}
        leftButtonText="Cancel"
        leftButtonCallback={this.handleModalClose}
        rightButtonText={itemText}
        rightButtonClassName="button button-danger"
        rightButtonCallback={this.handleRightButtonClick}
        showHeader={true}
      >
        <p>
          This action
          {" "}
          <strong>CANNOT</strong> be undone. This will permanently delete the
          {" "}
          <strong>{serviceName}</strong>
          {" "}
          {serviceLabel.toLowerCase()}.
          Type ("
          <strong>{serviceName}</strong>
          ") below to confirm you want to delete the
          {" "}
          {serviceLabel.toLowerCase()}.
        </p>
        <input
          className="form-control filter-input-text"
          onChange={this.handleChangeInputFieldDestroy}
          type="text"
          value={this.state.serviceNameConfirmationValue}
          autoFocus
        />
        {this.getErrorMessage()}
      </Confirm>
    );
  }

  getModalHeading() {
    const serviceLabel = this.getServiceLabel();

    return (
      <ModalHeading className="text-danger">
        {StringUtil.capitalize(UserActions.DELETE)} {serviceLabel}
      </ModalHeading>
    );
  }

  getSubHeader() {
    if (!this.props.subHeaderContent) {
      return null;
    }

    return (
      <p className="text-align-center flush-bottom">
        {this.props.subHeaderContent}
      </p>
    );
  }

  getServiceLabel() {
    const { service } = this.props;

    if (service instanceof Pod) {
      return "Pod";
    }

    if (service instanceof ServiceTree) {
      return "Group";
    }

    return "Service";
  }

  render() {
    const { service } = this.props;

    if (service instanceof Framework) {
      return this.getDestroyFrameworkModal();
    }

    return this.getDestroyServiceModal();
  }
}

ServiceDestroyModal.contextTypes = {
  router: routerShape
};

ServiceDestroyModal.propTypes = {
  deleteItem: PropTypes.func.isRequired,
  errors: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  intl: intlShape.isRequired,
  isPending: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  service: PropTypes.oneOfType([
    PropTypes.instanceOf(Framework),
    PropTypes.instanceOf(Pod),
    PropTypes.instanceOf(ServiceTree),
    PropTypes.instanceOf(Service)
  ]).isRequired
};

module.exports = injectIntl(ServiceDestroyModal);
