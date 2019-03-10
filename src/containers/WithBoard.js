import React, { Component } from 'react'
import { connect } from 'react-redux'
import { openBoard } from '../actions/board'
import { getBoardAddress } from '../utils/orbitdb'

function mapStateToProps(state){
    return {
        boards: state.boards.boards
    }
}

function mapDispatchToProps(dispatch){
    return {
        openBoard: address => dispatch(openBoard({ address, redirect: false }))
    }
}

export default function WithBoard(WrappedComponent) {
    class ToExport extends Component {

        componentDidMount() {
            const { boards, match } = this.props
            const address = getBoardAddress(match.params.hash, match.params.name)
            if (!boards[address]) {
                this.props.openBoard(address)
            }
        }

        componentWillReceiveProps({ match, boards }) {
            const address = getBoardAddress(match.params.hash, match.params.name)
            if (!boards[address]) {
                this.props.openBoard(address)
            }
        }

        render() {
            const { boards, match } = this.props
            const address = getBoardAddress(match.params.hash, match.params.name)
            const board = boards[address]
            if (board) {
                return <WrappedComponent {...board} {...this.props} />
            } else {
                return "Opening this board"
            }
        }
    }

    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(ToExport)

}