import { checkAndparseParametrizedString } from './utils'
import test from 'ava'
test('Should be able to check parametrized string', t => {
  t.deepEqual(checkAndparseParametrizedString('123 ${port}', '123 456'), {
    port: '456',
  })
  t.deepEqual(checkAndparseParametrizedString('123 ${port} ${test}', '123 456 678'), {
     port: '456',
     test: '678',
  })
  t.deepEqual(checkAndparseParametrizedString('123 ${port} ${test}', '123 456'), null)
  t.deepEqual(checkAndparseParametrizedString('123 ${port} ${test}', 'dezdezd6'), null)
})
