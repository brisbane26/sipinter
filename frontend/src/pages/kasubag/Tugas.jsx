import TugasListView from '../../components/TugasListView'
export default function Tugas() {
  return <TugasListView basePath="/kasubag/tugas" canCreate={true} title="Daftar Tugas" subtitle="Kelola tugas yang diberikan ke tiap Katim." />
}
