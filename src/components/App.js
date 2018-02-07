import React, { Component } from 'react';
import { Switch, Route, withRouter } from 'react-router-dom'
import Boards from '../containers/Boards'
import BoardEditor from '../containers/BoardEditor'
import WithBoard from '../containers/WithBoard'
import BoardPage from '../components/BoardPage'
import 'semantic-ui-css/semantic.css'

class App extends Component {
  render() {
    return (
      <Switch>
        <Route path='/b/new' component={BoardEditor} />
        <Route path='/b/:hash/:name/' component={withRouter(WithBoard(BoardPage))} />
        <Route path='/' component={Boards} />
      </Switch>
    )
  }
}

export default withRouter(App)
